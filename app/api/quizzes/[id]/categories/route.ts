import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions } from "@/lib/auth-helpers";
import { questionCategoryCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

async function ensureDefaultCategory(quizId: number) {
  const existing = await prisma.questionCategory.findFirst({
    where: { quizId, name: "Mặc định cho bài kiểm tra" },
  });
  if (existing) return existing;

  return prisma.questionCategory.create({
    data: { quizId, name: "Mặc định cho bài kiểm tra" },
  });
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quizId = Number(params.id);
  await ensureDefaultCategory(quizId);

  const categories = await prisma.questionCategory.findMany({
    where: { quizId },
    include: {
      _count: { select: { questions: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = questionCategoryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const quizId = Number(params.id);

  try {
    const category = await prisma.questionCategory.create({
      data: { quizId, name: parsed.data.name },
      include: { _count: { select: { questions: true } } },
    });
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Danh mục đã tồn tại" }, { status: 400 });
  }
}
