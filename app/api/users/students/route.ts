import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const unitIdParam = new URL(request.url).searchParams.get("unitId");
  const unitId = unitIdParam ? Number(unitIdParam) : null;

  const members = await prisma.user.findMany({
    where: {
      role: "UNIT_MEMBER",
      isActive: true,
      ...(user!.role === "UNIT_COMMANDER" && user!.unitId != null
        ? { unitId: user!.unitId }
        : unitId
          ? { unitId }
          : {}),
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      isActive: true,
      unit: { select: { id: true, name: true } },
    },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json(members);
}
