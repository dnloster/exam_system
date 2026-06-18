import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const courseId = Number(params.id);
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          isActive: true,
        },
      },
    },
    orderBy: { user: { fullName: "asc" } },
  });

  return NextResponse.json(
    enrollments.map((e) => ({
      ...e.user,
      enrolledAt: e.enrolledAt,
    }))
  );
}
