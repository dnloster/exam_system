import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions } from "@/lib/auth-helpers";
import { assertStudentQuizAccess } from "@/lib/quiz-access";
import { quizUpdateSchema } from "@/lib/validators";
import {
  enrichQuizQuestionsForResponse,
  computeQuizMaxGrade,
  loadRandomDrawMapForAttempt,
} from "@/lib/quiz-slots";

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
              options: { orderBy: { sortOrder: "asc" } },
            },
          },
          randomCategory: true,
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

  const attempt = quiz.attempts[0];
  const randomDrawMap =
    attempt != null
      ? await loadRandomDrawMapForAttempt(attempt.id)
      : undefined;

  const sanitizedQuestions = await enrichQuizQuestionsForResponse(
    quiz.id,
    quiz.questions,
    {
      isTeacherOrAdmin,
      randomDrawMap: isTeacherOrAdmin ? undefined : randomDrawMap,
    }
  );

  const maxGrade = computeQuizMaxGrade(sanitizedQuestions);

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
