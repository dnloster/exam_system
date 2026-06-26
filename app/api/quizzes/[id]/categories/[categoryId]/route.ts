import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions, assertCommanderQuizAccess } from "@/lib/auth-helpers";
import { questionCategoryUpdateSchema } from "@/lib/validators";
import { DEFAULT_CATEGORY_NAME } from "@/lib/question-helpers";
import { wouldCreateCycle } from "@/lib/category-tree";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; categoryId: string }> };

const categoryInclude = {
  _count: { select: { questions: true, children: true } },
  parent: { select: { id: true, name: true } },
} as const;

async function findCategory(quizId: number, categoryId: number) {
  return prisma.questionCategory.findFirst({
    where: { id: categoryId, quizId },
    include: categoryInclude,
  });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id, categoryId: categoryIdParam } = await params;
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quizId = Number(id);
  const accessError = await assertCommanderQuizAccess(quizId, user!);
  if (accessError) return accessError;
  const categoryId = Number(categoryIdParam);
  const body = await request.json();
  const parsed = questionCategoryUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const category = await findCategory(quizId, categoryId);
  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parentId =
    parsed.data.parentId !== undefined
      ? parsed.data.parentId
      : category.parentId;

  if (category.name === DEFAULT_CATEGORY_NAME && parentId != null) {
    return NextResponse.json(
      { error: "Danh mục mặc định phải là danh mục gốc" },
      { status: 400 }
    );
  }

  if (parentId != null) {
    const parent = await prisma.questionCategory.findFirst({
      where: { id: parentId, quizId },
    });
    if (!parent) {
      return NextResponse.json(
        { error: "Danh mục cha không hợp lệ" },
        { status: 400 }
      );
    }
  }

  const allCategories = await prisma.questionCategory.findMany({
    where: { quizId },
    select: { id: true, name: true, parentId: true },
  });

  if (
    wouldCreateCycle(categoryId, parentId, allCategories)
  ) {
    return NextResponse.json(
      { error: "Không thể đặt danh mục cha thành chính nó hoặc danh mục con" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.questionCategory.update({
      where: { id: categoryId },
      data: {
        name: parsed.data.name.trim(),
        parentId,
      },
      include: categoryInclude,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Tên danh mục đã tồn tại trong cùng cấp" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id, categoryId: categoryIdParam } = await params;
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quizId = Number(id);
  const accessError = await assertCommanderQuizAccess(quizId, user!);
  if (accessError) return accessError;
  const categoryId = Number(categoryIdParam);
  const category = await findCategory(quizId, categoryId);

  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (category.name === DEFAULT_CATEGORY_NAME) {
    return NextResponse.json(
      { error: "Không thể xóa danh mục mặc định" },
      { status: 400 }
    );
  }

  if (category._count.children > 0) {
    return NextResponse.json(
      {
        error: `Danh mục còn ${category._count.children} danh mục con. Hãy xóa hoặc chuyển trước.`,
      },
      { status: 400 }
    );
  }

  if (category._count.questions > 0) {
    return NextResponse.json(
      {
        error: `Danh mục còn ${category._count.questions} câu hỏi. Hãy xóa hoặc chuyển câu hỏi trước.`,
      },
      { status: 400 }
    );
  }

  await prisma.questionCategory.delete({ where: { id: categoryId } });
  return NextResponse.json({ success: true });
}
