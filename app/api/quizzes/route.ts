import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions } from "@/lib/auth-helpers";
import { studentQuizListWhere } from "@/lib/quiz-access";
import { quizCreateSchema } from "@/lib/validators";
import { computeQuizMaxGradeFromDbQuestions } from "@/lib/quiz-slots";

export const dynamic = "force-dynamic";

function parseQuizDates(data: {
  openAt?: string | null;
  closeAt?: string | null;
}) {
  return {
    openAt: data.openAt ? new Date(data.openAt) : null,
    closeAt: data.closeAt ? new Date(data.closeAt) : null,
  };
}

export async function GET() {
  const { error, user } = await requireAuth();
  if (error) return error;

  const isTeacherOrAdmin =
    user!.role === "TEACHER" || user!.role === "ADMIN";

  const userId = Number(user!.id);

  const quizzes = await prisma.quiz.findMany({
    where: isTeacherOrAdmin ? undefined : studentQuizListWhere(userId),
    include: {
      course: true,
      createdBy: { select: { fullName: true } },
      questions: {
        include: { question: true, randomCategory: true },
      },
      participants: isTeacherOrAdmin
        ? { include: { user: { select: { id: true, fullName: true } } } }
        : false,
      attempts: isTeacherOrAdmin
        ? true
        : { where: { userId } },
      _count: isTeacherOrAdmin ? { select: { participants: true } } : undefined,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!isTeacherOrAdmin) {
    const enrolledQuizIds = (
      await prisma.quizParticipant.findMany({
        where: { userId: Number(user!.id) },
        select: { quizId: true, addedAt: true },
        orderBy: { addedAt: "desc" },
      })
    ).map((p) => p.quizId);
    const enrolledOrder = new Map(
      enrolledQuizIds.map((id, index) => [id, index])
    );

    quizzes.sort((a, b) => {
      const aRank = enrolledOrder.get(a.id);
      const bRank = enrolledOrder.get(b.id);
      if (aRank !== undefined && bRank !== undefined) return aRank - bRank;
      if (aRank !== undefined) return -1;
      if (bRank !== undefined) return 1;
      return b.createdAt > a.createdAt ? -1 : 1;
    });
  }

  const withMaxGrade = await Promise.all(
    quizzes.map(async (quiz) => ({
      ...quiz,
      maxGrade: await computeQuizMaxGradeFromDbQuestions(quiz.id, quiz.questions),
    }))
  );

  return NextResponse.json(withMaxGrade);
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = quizCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  const dates = parseQuizDates(parsed.data);

  const quiz = await prisma.quiz.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      courseId: parsed.data.courseId ?? undefined,
      openAt: dates.openAt,
      closeAt: dates.closeAt,
      timeLimitMinutes: parsed.data.timeLimitMinutes ?? undefined,
      shuffleQuestions: parsed.data.shuffleQuestions,
      questionsPerPage: parsed.data.questionsPerPage,
      attemptsAllowed: parsed.data.attemptsAllowed,
      passingScore: parsed.data.passingScore,
      isPublished: parsed.data.isPublished,
      createdById: Number(user!.id),
      questionCategories: {
        create: { name: "Mặc định cho bài kiểm tra" },
      },
    },
    include: {
      course: true,
      questions: { include: { question: { include: { options: true } } } },
    },
  });

  return NextResponse.json(quiz, { status: 201 });
}
