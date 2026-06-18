import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions } from "@/lib/auth-helpers";
import { assertStudentQuizAccess } from "@/lib/quiz-access";
import { isMultipleResponseQuestion } from "@/lib/quiz-grading";
import { quizUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const quiz = await prisma.quiz.findUnique({
    where: { id: Number(params.id) },
    include: {
      course: true,
      createdBy: { select: { fullName: true } },
      questions: {
        include: {
          question: {
            include: {
              options: { select: { id: true, text: true, isCorrect: true, gradePercent: true } },
            },
          },
        },
        orderBy: { order: "asc" },
      },
      attempts: { where: { userId: Number(user!.id) } },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isTeacherOrAdmin =
    user!.role === "TEACHER" || user!.role === "ADMIN";

  if (!isTeacherOrAdmin) {
    const access = await assertStudentQuizAccess(
      quiz.id,
      Number(user!.id)
    );
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
  }

  const maxGrade = quiz.questions.reduce(
    (sum, q) => sum + q.question.points,
    0
  );

  const sanitizedQuestions = quiz.questions.map((qq) => {
    const multipleResponse = isMultipleResponseQuestion(qq.question.options);
    return {
      ...qq,
      question: {
        ...qq.question,
        multipleResponse,
        options: qq.question.options.map((o) => ({
          id: o.id,
          text: o.text,
          ...(isTeacherOrAdmin
            ? { isCorrect: o.isCorrect, gradePercent: o.gradePercent }
            : {}),
        })),
      },
    };
  });

  return NextResponse.json({
    ...quiz,
    questions: sanitizedQuestions,
    maxGrade,
  });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = quizUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  const { openAt, closeAt, ...rest } = parsed.data;

  const quiz = await prisma.quiz.update({
    where: { id: Number(params.id) },
    data: {
      ...rest,
      ...(openAt !== undefined && {
        openAt: openAt ? new Date(openAt) : null,
      }),
      ...(closeAt !== undefined && {
        closeAt: closeAt ? new Date(closeAt) : null,
      }),
    },
    include: {
      course: true,
      questions: { include: { question: { include: { options: true } } } },
    },
  });

  return NextResponse.json(quiz);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.quiz.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ success: true });
}
