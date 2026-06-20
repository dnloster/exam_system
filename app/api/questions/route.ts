import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions } from "@/lib/auth-helpers";
import { getOrCreateDefaultCategory } from "@/lib/question-helpers";
import { questionCreateSchema } from "@/lib/validators";
import { prismaQuestionDataFromForm } from "@/lib/question-api";
import { getDescendantIds } from "@/lib/category-tree";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const includeSubcategories =
    searchParams.get("includeSubcategories") === "true";
  const quizId = searchParams.get("quizId");

  if (!quizId) {
    return NextResponse.json(
      { error: "quizId là bắt buộc — ngân hàng câu hỏi được quản lý theo từng bài kiểm tra" },
      { status: 400 }
    );
  }

  let categoryFilter: { categoryId?: number | { in: number[] } } = {};
  if (categoryId) {
    const parsedCategoryId = Number(categoryId);
    if (includeSubcategories) {
      const categories = await prisma.questionCategory.findMany({
        where: { quizId: Number(quizId) },
        select: { id: true, parentId: true },
      });
      categoryFilter = {
        categoryId: {
          in: Array.from(getDescendantIds(parsedCategoryId, categories)),
        },
      };
    } else {
      categoryFilter = { categoryId: parsedCategoryId };
    }
  }

  const questions = await prisma.question.findMany({
    where: {
      questionCategory: { quizId: Number(quizId) },
      ...categoryFilter,
    },
    include: {
      options: { orderBy: { sortOrder: "asc" } },
      createdBy: { select: { fullName: true } },
      questionCategory: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(questions);
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = questionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  if (!parsed.data.quizId) {
    return NextResponse.json(
      { error: "quizId là bắt buộc — ngân hàng câu hỏi được quản lý theo từng bài kiểm tra" },
      { status: 400 }
    );
  }

  let categoryId = parsed.data.categoryId ?? null;

  if (!categoryId) {
    const defaultCat = await getOrCreateDefaultCategory(parsed.data.quizId);
    categoryId = defaultCat.id;
  } else {
    const cat = await prisma.questionCategory.findFirst({
      where: { id: categoryId, quizId: parsed.data.quizId },
    });
    if (!cat) {
      return NextResponse.json(
        { error: "Danh mục không thuộc bài kiểm tra này" },
        { status: 400 }
      );
    }
  }

  const question = await prisma.question.create({
    data: prismaQuestionDataFromForm(
      parsed.data,
      categoryId,
      Number(user!.id)
    ),
    include: { options: true, questionCategory: true },
  });

  return NextResponse.json(question, { status: 201 });
}
