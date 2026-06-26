import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  canManageQuestions,
  assertCommanderQuizAccess,
} from "@/lib/auth-helpers";
import { quizParticipantEnrolSchema } from "@/lib/validators";
import { resolveEnrollmentUserIds } from "@/lib/enrollment-eligibility";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const participantInclude = {
  user: {
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      isActive: true,
      unit: { select: { id: true, name: true } },
    },
  },
} as const;

async function getQuizUnitId(quizId: number) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { unitId: true },
  });
  return quiz?.unitId ?? null;
}

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

  const participants = await prisma.quizParticipant.findMany({
    where: { quizId },
    include: participantInclude,
    orderBy: { addedAt: "asc" },
  });

  return NextResponse.json(participants);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quizId = Number(id);
  const accessError = await assertCommanderQuizAccess(quizId, user!);
  if (accessError) return accessError;

  const quizUnitId = await getQuizUnitId(quizId);
  if (quizUnitId == null) {
    return NextResponse.json(
      { error: "Bài kiểm tra chưa gắn đơn vị" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = quizParticipantEnrolSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  const userIds = await resolveEnrollmentUserIds(user!, quizUnitId, parsed.data);

  if (userIds.length === 0) {
    return NextResponse.json(
      { error: "Không có đối tượng hợp lệ để ghi danh" },
      { status: 400 }
    );
  }

  await prisma.quizParticipant.createMany({
    data: userIds.map((userId) => ({ quizId, userId })),
    skipDuplicates: true,
  });

  const quiz = await prisma.quiz.update({
    where: { id: quizId },
    data: { isPublished: true },
    select: { isPublished: true },
  });

  const participants = await prisma.quizParticipant.findMany({
    where: { quizId },
    include: participantInclude,
  });

  return NextResponse.json(
    {
      participants,
      enrolledCount: userIds.length,
      isPublished: quiz.isPublished,
    },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quizId = Number(id);
  const accessError = await assertCommanderQuizAccess(quizId, user!);
  if (accessError) return accessError;

  const userId = Number(new URL(request.url).searchParams.get("userId"));

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  await prisma.quizParticipant.delete({
    where: {
      quizId_userId: { quizId, userId },
    },
  });

  return NextResponse.json({ success: true });
}
