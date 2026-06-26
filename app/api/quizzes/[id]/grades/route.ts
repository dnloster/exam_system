import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  canManageQuestions,
  assertCommanderQuizAccess,
} from "@/lib/auth-helpers";
import { QUIZ_TOTAL_POINTS } from "@/lib/quiz-points";
import { isBelowPassing, isGoodOrAbove } from "@/lib/grade-scale";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quizId = Number(id);
  const accessError = await assertCommanderQuizAccess(quizId, user!);
  if (accessError) return accessError;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      title: true,
      passingScore: true,
      _count: { select: { questions: true } },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [participants, attempts] = await Promise.all([
    prisma.quizParticipant.findMany({
      where: { quizId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            unit: { select: { name: true } },
          },
        },
      },
      orderBy: { user: { fullName: "asc" } },
    }),
    prisma.quizAttempt.findMany({
      where: { quizId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            unit: { select: { name: true } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  const attemptByUserId = new Map(attempts.map((a) => [a.userId, a]));
  const seenUserIds = new Set<number>();

  type GradeRow = {
    userId: number;
    fullName: string;
    username: string;
    unitName: string | null;
    enrolled: boolean;
    status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED";
    score: number | null;
    pointsEarned: number | null;
    passed: boolean | null;
    startedAt: string | null;
    submittedAt: string | null;
    attemptId: number | null;
  };

  const rows: GradeRow[] = [];

  for (const p of participants) {
    seenUserIds.add(p.userId);
    const attempt = attemptByUserId.get(p.userId);
    rows.push(buildGradeRow(p.user, true, quiz.passingScore, attempt));
  }

  for (const attempt of attempts) {
    if (seenUserIds.has(attempt.userId)) continue;
    rows.push(buildGradeRow(attempt.user, false, quiz.passingScore, attempt));
  }

  rows.sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));

  const submitted = rows.filter((r) => r.status === "SUBMITTED");
  const passed = submitted.filter((r) => r.passed);
  const submittedScores = submitted.filter(
    (r): r is typeof r & { score: number } => r.score != null
  );
  const goodOrAbove = submittedScores.filter((r) => isGoodOrAbove(r.score));
  const belowPass = submittedScores.filter((r) =>
    isBelowPassing(r.score, quiz.passingScore)
  );

  const summary = {
    submittedCount: submitted.length,
    inProgressCount: rows.filter((r) => r.status === "IN_PROGRESS").length,
    notStartedCount: rows.filter((r) => r.status === "NOT_STARTED").length,
    passCount: passed.length,
    passRate:
      submitted.length > 0 ? (passed.length / submitted.length) * 100 : null,
    goodOrAboveCount: goodOrAbove.length,
    goodOrAboveRate:
      submitted.length > 0
        ? (goodOrAbove.length / submitted.length) * 100
        : null,
    belowPassCount: belowPass.length,
    belowPassRate:
      submitted.length > 0
        ? (belowPass.length / submitted.length) * 100
        : null,
    maxPoints: QUIZ_TOTAL_POINTS,
  };

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      passingScore: quiz.passingScore,
      questionCount: quiz._count.questions,
    },
    summary,
    rows,
  });
}

function buildGradeRow(
  user: {
    id: number;
    username: string;
    fullName: string;
    unit: { name: string } | null;
  },
  enrolled: boolean,
  passingScore: number,
  attempt?: {
    id: number;
    status: string;
    score: number | null;
    startedAt: Date;
    submittedAt: Date | null;
  }
): {
  userId: number;
  fullName: string;
  username: string;
  unitName: string | null;
  enrolled: boolean;
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED";
  score: number | null;
  pointsEarned: number | null;
  passed: boolean | null;
  startedAt: string | null;
  submittedAt: string | null;
  attemptId: number | null;
} {
  if (!attempt) {
    return {
      userId: user.id,
      fullName: user.fullName,
      username: user.username,
      unitName: user.unit?.name ?? null,
      enrolled,
      status: "NOT_STARTED",
      score: null,
      pointsEarned: null,
      passed: null,
      startedAt: null,
      submittedAt: null,
      attemptId: null,
    };
  }

  const status =
    attempt.status === "SUBMITTED" ? "SUBMITTED" : "IN_PROGRESS";

  return {
    userId: user.id,
    fullName: user.fullName,
    username: user.username,
    unitName: user.unit?.name ?? null,
    enrolled,
    status,
    score: attempt.score,
    pointsEarned:
      attempt.score != null
        ? (attempt.score / 100) * QUIZ_TOTAL_POINTS
        : null,
    passed:
      attempt.status === "SUBMITTED" && attempt.score != null
        ? attempt.score >= passingScore
        : null,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    attemptId: attempt.id,
  };
}
