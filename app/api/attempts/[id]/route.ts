import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { attemptSubmitSchema } from "@/lib/validators";
import {
  gradeQuestionAnswer,
  scoreQuestionAnswer,
} from "@/lib/quiz-grading";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: Number(params.id) },
    include: {
      user: { select: { fullName: true, username: true } },
      quiz: {
        include: {
          questions: {
            include: {
              question: { include: { options: true } },
            },
          },
        },
      },
      answers: {
        include: {
          question: { include: { options: true } },
          selectedOption: true,
        },
      },
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isTeacherOrAdmin =
    user!.role === "TEACHER" || user!.role === "ADMIN";
  if (attempt.userId !== Number(user!.id) && !isTeacherOrAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enrichedAnswers = attempt.answers.map((a) => {
    const selectedIds = Array.isArray(a.selectedOptionIds)
      ? (a.selectedOptionIds as number[])
      : a.selectedOptionId != null
        ? [a.selectedOptionId]
        : [];

    const selectedOptions = a.question.options.filter((o) =>
      selectedIds.includes(o.id)
    );

    return {
      ...a,
      selectedOptions,
      selectedTexts: selectedOptions.map((o) => o.text),
    };
  });

  return NextResponse.json({ ...attempt, answers: enrichedAnswers });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const attemptId = Number(params.id);
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          questions: {
            include: {
              question: { include: { options: true } },
            },
          },
        },
      },
      answers: true,
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (attempt.userId !== Number(user!.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (attempt.status === "SUBMITTED") {
    return NextResponse.json({ error: "Already submitted" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = attemptSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  let earnedPoints = 0;
  let maxPoints = 0;

  for (const answer of parsed.data.answers) {
    const quizQuestion = attempt.quiz.questions.find(
      (q) => q.questionId === answer.questionId
    );
    const question = quizQuestion?.question;

    if (!question) continue;

    maxPoints += question.points;

    const selectedOptionIds = answer.selectedOptionIds?.length
      ? answer.selectedOptionIds
      : undefined;

    const scoreFraction = scoreQuestionAnswer(
      question.options,
      answer.selectedOptionId,
      selectedOptionIds
    );
    earnedPoints += question.points * scoreFraction;

    const isCorrect = gradeQuestionAnswer(
      question.options,
      answer.selectedOptionId,
      selectedOptionIds
    );

    const storedIds =
      selectedOptionIds ??
      (answer.selectedOptionId != null ? [answer.selectedOptionId] : []);

    await prisma.attemptAnswer.update({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId: answer.questionId,
        },
      },
      data: {
        selectedOptionId: storedIds[0] ?? null,
        selectedOptionIds: storedIds.length > 0 ? storedIds : undefined,
        isCorrect,
        scoreFraction,
      },
    });
  }

  const score = maxPoints > 0 ? (earnedPoints / maxPoints) * 100 : 0;

  const updated = await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      score,
    },
    include: {
      quiz: true,
      answers: {
        include: {
          question: { include: { options: true } },
          selectedOption: true,
        },
      },
    },
  });

  return NextResponse.json(updated);
}
