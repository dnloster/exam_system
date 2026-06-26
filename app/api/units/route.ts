import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const units = await prisma.unit.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      unitKind: true,
      sortOrder: true,
      _count: { select: { users: true, quizzes: true } },
    },
  });

  return NextResponse.json(units);
}
