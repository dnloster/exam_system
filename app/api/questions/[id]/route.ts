import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions } from "@/lib/auth-helpers";
import { assertQuestionInQuiz } from "@/lib/question-helpers";
import { questionUpdateSchema } from "@/lib/validators";
import { prismaQuestionUpdateFromForm } from "@/lib/question-api";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const question = await prisma.question.findUnique({
    where: { id: Number(id) },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });

  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(question);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id: idParam } = await params;
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = questionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  const id = Number(idParam);

  if (parsed.data.quizId) {
    const scopeError = await assertQuestionInQuiz(id, parsed.data.quizId);
    if (scopeError) {
      return NextResponse.json({ error: scopeError }, { status: 400 });
    }
    if (parsed.data.categoryId) {
      const cat = await prisma.questionCategory.findFirst({
        where: { id: parsed.data.categoryId, quizId: parsed.data.quizId },
      });
      if (!cat) {
        return NextResponse.json(
          { error: "Danh mục không thuộc bài kiểm tra này" },
          { status: 400 }
        );
      }
    }
  }

  await prisma.answerOption.deleteMany({ where: { questionId: id } });

  const question = await prisma.question.update({
    where: { id },
    data: prismaQuestionUpdateFromForm(parsed.data),
    include: { options: true, questionCategory: true },
  });

  return NextResponse.json(question);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quizId = Number(new URL(request.url).searchParams.get("quizId"));
  if (quizId) {
    const scopeError = await assertQuestionInQuiz(
      Number(id),
      quizId
    );
    if (scopeError) {
      return NextResponse.json({ error: scopeError }, { status: 400 });
    }
  }

  await prisma.question.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
