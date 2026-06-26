import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions, assertCommanderQuizAccess } from "@/lib/auth-helpers";
import { questionCategoryCreateSchema } from "@/lib/validators";
import { DEFAULT_CATEGORY_NAME } from "@/lib/question-helpers";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const categoryInclude = {
  _count: { select: { questions: true, children: true } },
  parent: { select: { id: true, name: true } },
} as const;

async function ensureDefaultCategory(quizId: number) {
  const existing = await prisma.questionCategory.findFirst({
    where: { quizId, name: DEFAULT_CATEGORY_NAME, parentId: null },
  });
  if (existing) return existing;

  return prisma.questionCategory.create({
    data: { quizId, name: DEFAULT_CATEGORY_NAME, parentId: null },
  });
}

async function validateParent(
  quizId: number,
  parentId: number | null | undefined
) {
  if (parentId == null) return null;

  const parent = await prisma.questionCategory.findFirst({
    where: { id: parentId, quizId },
  });
  if (!parent) {
    return "Danh mục cha không thuộc bài kiểm tra này";
  }
  return null;
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
  await ensureDefaultCategory(quizId);

  const categories = await prisma.questionCategory.findMany({
    where: { quizId },
    include: categoryInclude,
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(categories);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
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

  const quizId = Number(id);
  const accessError = await assertCommanderQuizAccess(quizId, user!);
  if (accessError) return accessError;
  const parentId = parsed.data.parentId ?? null;

  const parentError = await validateParent(quizId, parentId);
  if (parentError) {
    return NextResponse.json({ error: parentError }, { status: 400 });
  }

  try {
    const category = await prisma.questionCategory.create({
      data: {
        quizId,
        name: parsed.data.name.trim(),
        parentId,
      },
      include: categoryInclude,
    });
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Tên danh mục đã tồn tại trong cùng cấp" },
      { status: 400 }
    );
  }
}
