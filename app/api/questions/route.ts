import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions } from "@/lib/auth-helpers";
import { getOrCreateDefaultCategory } from "@/lib/question-helpers";
import {
  questionCreateSchema,
  optionsFromGrades,
} from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const quizId = searchParams.get("quizId");

  if (!quizId) {
    return NextResponse.json(
      { error: "quizId là bắt buộc — ngân hàng câu hỏi được quản lý theo từng bài kiểm tra" },
      { status: 400 }
    );
  }

  const questions = await prisma.question.findMany({
    where: {
      questionCategory: { quizId: Number(quizId) },
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
    },
    include: {
      options: true,
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
    data: {
      name: parsed.data.name,
      content: parsed.data.content,
      categoryId,
      points: Math.round(parsed.data.points),
      generalFeedback: parsed.data.generalFeedback,
      shuffleAnswers: parsed.data.shuffleAnswers,
      createdById: Number(user!.id),
      options: { create: optionsFromGrades(parsed.data.options) },
    },
    include: { options: true, questionCategory: true },
  });

  return NextResponse.json(question, { status: 201 });
}
