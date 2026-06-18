import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions } from "@/lib/auth-helpers";
import { quizParticipantEnrolSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quizId = Number(params.id);
  const participants = await prisma.quizParticipant.findMany({
    where: { quizId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          isActive: true,
          courseEnrollments: {
            include: { course: { select: { id: true, code: true, name: true } } },
          },
        },
      },
    },
    orderBy: { addedAt: "asc" },
  });

  return NextResponse.json(participants);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = quizParticipantEnrolSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  const quizId = Number(params.id);
  let userIds: number[] = parsed.data.userIds ?? [];

  if (parsed.data.courseId) {
    const enrolled = await prisma.courseEnrollment.findMany({
      where: {
        courseId: parsed.data.courseId,
        user: { role: "STUDENT", isActive: true },
      },
      select: { userId: true },
    });
    userIds = Array.from(
      new Set([...userIds, ...enrolled.map((e) => e.userId)])
    );
  }

  if (userIds.length === 0) {
    return NextResponse.json(
      { error: "Không có sinh viên hợp lệ để ghi danh" },
      { status: 400 }
    );
  }

  const students = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      role: "STUDENT",
      isActive: true,
    },
  });

  if (students.length === 0) {
    return NextResponse.json({ error: "Không có sinh viên hợp lệ" }, { status: 400 });
  }

  await prisma.quizParticipant.createMany({
    data: students.map((s) => ({ quizId, userId: s.id })),
    skipDuplicates: true,
  });

  const quiz = await prisma.quiz.update({
    where: { id: quizId },
    data: { isPublished: true },
    select: { isPublished: true },
  });

  const participants = await prisma.quizParticipant.findMany({
    where: { quizId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          isActive: true,
          courseEnrollments: {
            include: { course: { select: { id: true, code: true, name: true } } },
          },
        },
      },
    },
  });

  return NextResponse.json(
    {
      participants,
      enrolledCount: students.length,
      isPublished: quiz.isPublished,
    },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = Number(new URL(request.url).searchParams.get("userId"));
  const courseId = Number(new URL(request.url).searchParams.get("courseId"));

  if (courseId) {
    const enrolled = await prisma.courseEnrollment.findMany({
      where: { courseId },
      select: { userId: true },
    });
    const ids = enrolled.map((e) => e.userId);
    await prisma.quizParticipant.deleteMany({
      where: { quizId: Number(params.id), userId: { in: ids } },
    });
    return NextResponse.json({ success: true, removed: ids.length });
  }

  if (!userId) {
    return NextResponse.json({ error: "userId or courseId required" }, { status: 400 });
  }

  await prisma.quizParticipant.delete({
    where: {
      quizId_userId: { quizId: Number(params.id), userId },
    },
  });

  return NextResponse.json({ success: true });
}
