import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  canManageQuestions,
  assertCommanderQuizAccess,
} from "@/lib/auth-helpers";
import {
  listEligibleEnrollees,
  getCommanderEnrollmentCapabilities,
} from "@/lib/enrollment-eligibility";

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
    select: { unitId: true },
  });

  if (quiz?.unitId == null) {
    return NextResponse.json(
      { error: "Bài kiểm tra chưa gắn đơn vị" },
      { status: 400 }
    );
  }

  const [enrollees, capabilities, courses] = await Promise.all([
    listEligibleEnrollees(user!, quiz.unitId),
    getCommanderEnrollmentCapabilities(user!, quiz.unitId),
    prisma.course.findMany({
      include: { _count: { select: { enrollments: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    enrollees,
    capabilities,
    courses,
  });
}
