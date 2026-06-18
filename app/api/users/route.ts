import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageUsers } from "@/lib/auth-helpers";
import { userCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageUsers(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageUsers(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = userCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });
  if (existing) {
    return NextResponse.json({ error: "Username already exists" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const newUser = await prisma.user.create({
    data: {
      username: parsed.data.username,
      passwordHash,
      fullName: parsed.data.fullName,
      role: parsed.data.role,
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json(newUser, { status: 201 });
}
