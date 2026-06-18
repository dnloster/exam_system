import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions } from "@/lib/auth-helpers";
import {
  assertQuestionInQuiz,
  getOrCreateDefaultCategory,
} from "@/lib/question-helpers";
import {
  quizQuestionAttachSchema,
  quizQuestionCreateSchema,
  optionsFromGrades,
} from "@/lib/validators";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

async function attachQuestion(quizId: number, questionId: number) {
  const maxOrder = await prisma.quizQuestion.aggregate({
    where: { quizId },
    _max: { order: true },
  });

  return prisma.quizQuestion.create({
    data: {
      quizId,
      questionId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
    include: { question: { include: { options: true } } },
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quizId = Number(params.id);
  const body = await request.json();

  const attachParsed = quizQuestionAttachSchema.safeParse(body);
  if (attachParsed.success) {
    const scopeError = await assertQuestionInQuiz(
      attachParsed.data.questionId,
      quizId
    );
    if (scopeError) {
      return NextResponse.json({ error: scopeError }, { status: 400 });
    }

    const existing = await prisma.quizQuestion.findUnique({
      where: {
        quizId_questionId: {
          quizId,
          questionId: attachParsed.data.questionId,
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Câu hỏi đã có trong bài kiểm tra" },
        { status: 400 }
      );
    }

    const link = await attachQuestion(quizId, attachParsed.data.questionId);
    return NextResponse.json(link, { status: 201 });
  }

  const createParsed = quizQuestionCreateSchema.safeParse(body);
  if (!createParsed.success) {
    return NextResponse.json(
      { error: createParsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  const defaultCat = await getOrCreateDefaultCategory(quizId);

  const question = await prisma.question.create({
    data: {
      name: createParsed.data.name,
      content: createParsed.data.content,
      categoryId: defaultCat.id,
      points: Math.round(createParsed.data.points),
      generalFeedback: createParsed.data.generalFeedback,
      shuffleAnswers: createParsed.data.shuffleAnswers,
      createdById: Number(user!.id),
      options: { create: optionsFromGrades(createParsed.data.options) },
    },
  });

  const link = await attachQuestion(quizId, question.id);
  return NextResponse.json(link, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const questionId = Number(searchParams.get("questionId"));
  if (!questionId) {
    return NextResponse.json({ error: "questionId required" }, { status: 400 });
  }

  await prisma.quizQuestion.delete({
    where: {
      quizId_questionId: {
        quizId: Number(params.id),
        questionId,
      },
    },
  });

  return NextResponse.json({ success: true });
}
