import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isCommanderOrAdmin } from "@/lib/roles";

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  unitId: number | null;
  unitName: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireAuth(roles?: Role[]) {
  const user = await getSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
  }
  if (roles && !roles.includes(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null };
  }
  return { error: null, user };
}

export function canManageQuestions(role: Role) {
  return isCommanderOrAdmin(role);
}

export function canManageUsers(role: Role) {
  return role === "ADMIN";
}

export function commanderQuizListWhere(user: SessionUser) {
  if (user.role === "ADMIN") return undefined;
  if (user.role === "UNIT_COMMANDER" && user.unitId != null) {
    return { unitId: user.unitId };
  }
  return { id: -1 };
}

/** Chỉ huy: luôn dùng đơn vị của mình. Admin (test): chọn đơn vị khi tạo. */
export async function resolveQuizUnitIdForCreate(
  user: SessionUser,
  requestedUnitId?: number | null
): Promise<{ unitId: number } | { error: string; status: number }> {
  if (user.role === "UNIT_COMMANDER") {
    if (user.unitId == null) {
      return {
        error: "Tài khoản chỉ huy chưa được gắn đơn vị",
        status: 400,
      };
    }
    return { unitId: user.unitId };
  }

  if (user.role === "ADMIN") {
    if (requestedUnitId == null) {
      return {
        error: "Tài khoản quản trị cần chọn đơn vị khi tạo bài kiểm tra (để test)",
        status: 400,
      };
    }
    const unit = await prisma.unit.findUnique({
      where: { id: requestedUnitId },
      select: { id: true },
    });
    if (!unit) {
      return { error: "Đơn vị không tồn tại", status: 400 };
    }
    return { unitId: unit.id };
  }

  return { error: "Forbidden", status: 403 };
}

export async function assertCommanderQuizAccess(
  quizId: number,
  user: SessionUser
) {
  if (user.role === "ADMIN") return null;

  if (user.role !== "UNIT_COMMANDER" || user.unitId == null) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { unitId: true },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (quiz.unitId !== user.unitId) {
    return NextResponse.json(
      { error: "Bài kiểm tra không thuộc đơn vị của bạn" },
      { status: 403 }
    );
  }

  return null;
}

export async function assertSingleCommanderPerUnit(
  unitId: number,
  excludeUserId?: number
) {
  const existing = await prisma.user.findFirst({
    where: {
      unitId,
      role: "UNIT_COMMANDER",
      ...(excludeUserId != null ? { id: { not: excludeUserId } } : {}),
    },
    select: { username: true },
  });

  if (existing) {
    return `Đơn vị đã có chỉ huy (${existing.username})`;
  }

  return null;
}
