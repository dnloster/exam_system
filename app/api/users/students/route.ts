import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const students = await prisma.user.findMany({
    where: { role: "STUDENT", isActive: true },
    select: {
      id: true,
      username: true,
      fullName: true,
      isActive: true,
    },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json(students);
}
