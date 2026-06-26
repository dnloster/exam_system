import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions, assertCommanderQuizAccess } from "@/lib/auth-helpers";
import { isCommanderOrAdmin } from "@/lib/roles";
import { assertStudentQuizAccess } from "@/lib/quiz-access";
import { quizUpdateSchema } from "@/lib/validators";
import {
  enrichQuizQuestionsForResponse,
  computeQuizMaxGrade,
  loadRandomDrawMapForAttempt,
} from "@/lib/quiz-slots";
import {
  resolveAccessPasswordUpdate,
  stripQuizPasswordHash,
} from "@/lib/quiz-access-password";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error, user } = await requireAuth();
  if (error) return error;

  const quiz = await prisma.quiz.findUnique({
    where: { id: Number(id) },
    include: {
      course: true,
      unit: { select: { id: true, name: true } },
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

  const isManager = isCommanderOrAdmin(user!.role);

  if (isManager) {
    const accessError = await assertCommanderQuizAccess(quiz.id, user!);
    if (accessError) return accessError;
  } else {
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
      isTeacherOrAdmin: isManager,
      randomDrawMap: isManager ? undefined : randomDrawMap,
    }
  );

  const maxGrade = computeQuizMaxGrade(sanitizedQuestions);

  return NextResponse.json(
    stripQuizPasswordHash({
      ...quiz,
      questions: sanitizedQuestions,
      maxGrade,
    })
  );
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const accessError = await assertCommanderQuizAccess(Number(id), user!);
  if (accessError) return accessError;

  const body = await request.json();
  const parsed = quizUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  const { openAt, closeAt, accessPassword, removeAccessPassword, ...rest } =
    parsed.data;

  const passwordUpdate = await resolveAccessPasswordUpdate(
    accessPassword,
    removeAccessPassword
  );

  const quiz = await prisma.quiz.update({
    where: { id: Number(id) },
    data: {
      ...rest,
      ...(passwordUpdate ?? {}),
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

  return NextResponse.json(stripQuizPasswordHash(quiz));
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const accessError = await assertCommanderQuizAccess(Number(id), user!);
  if (accessError) return accessError;

  await prisma.quiz.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
