import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions } from "@/lib/auth-helpers";
import { assertQuestionInQuiz } from "@/lib/question-helpers";
import {
  questionUpdateSchema,
  optionsFromGrades,
} from "@/lib/validators";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const question = await prisma.question.findUnique({
    where: { id: Number(params.id) },
    include: { options: true },
  });

  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(question);
}

export async function PUT(request: NextRequest, { params }: Params) {
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

  const id = Number(params.id);

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
    data: {
      name: parsed.data.name,
      content: parsed.data.content,
      categoryId: parsed.data.categoryId ?? undefined,
      points: Math.round(parsed.data.points),
      generalFeedback: parsed.data.generalFeedback,
      shuffleAnswers: parsed.data.shuffleAnswers,
      options: { create: optionsFromGrades(parsed.data.options) },
    },
    include: { options: true, questionCategory: true },
  });

  return NextResponse.json(question);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quizId = Number(new URL(request.url).searchParams.get("quizId"));
  if (quizId) {
    const scopeError = await assertQuestionInQuiz(
      Number(params.id),
      quizId
    );
    if (scopeError) {
      return NextResponse.json({ error: scopeError }, { status: 400 });
    }
  }

  await prisma.question.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ success: true });
}
