import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions } from "@/lib/auth-helpers";
import {
  assertQuestionInQuiz,
  getOrCreateDefaultCategory,
} from "@/lib/question-helpers";
import {
  quizQuestionAttachBatchSchema,
  quizQuestionAttachSchema,
  quizQuestionCreateSchema,
} from "@/lib/validators";
import { prismaQuestionDataFromForm } from "@/lib/question-api";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

async function attachQuestion(quizId: number, questionId: number) {
  const maxOrder = await prisma.quizQuestion.aggregate({
    where: { quizId },
    _max: { order: true },
  });

  return prisma.quizQuestion.create({
    data: {
      quizId,
      questionId,
      slotType: "FIXED",
      order: (maxOrder._max.order ?? -1) + 1,
    },
    include: { question: { include: { options: true } } },
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quizId = Number(params.id);
  const body = await request.json();

  const batchParsed = quizQuestionAttachBatchSchema.safeParse(body);
  if (batchParsed.success) {
    const uniqueIds = Array.from(new Set(batchParsed.data.questionIds));
    for (const questionId of uniqueIds) {
      const scopeError = await assertQuestionInQuiz(questionId, quizId);
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 400 });
      }
    }

    const existing = await prisma.quizQuestion.findMany({
      where: { quizId, questionId: { in: uniqueIds } },
      select: { questionId: true },
    });
    const existingIds = new Set(existing.map((e) => e.questionId));
    const toAttach = uniqueIds.filter((id) => !existingIds.has(id));

    if (toAttach.length === 0) {
      return NextResponse.json(
        { attached: 0, skipped: uniqueIds.length, message: "Tất cả câu hỏi đã có trong bài kiểm tra" },
        { status: 200 }
      );
    }

    const maxOrder = await prisma.quizQuestion.aggregate({
      where: { quizId },
      _max: { order: true },
    });
    let order = (maxOrder._max.order ?? -1) + 1;

    const links = await prisma.$transaction(
      toAttach.map((questionId) =>
        prisma.quizQuestion.create({
          data: { quizId, questionId, order: order++ },
          include: { question: { include: { options: true } } },
        })
      )
    );

    return NextResponse.json(
      {
        attached: links.length,
        skipped: uniqueIds.length - links.length,
        links,
      },
      { status: 201 }
    );
  }

  const attachParsed = quizQuestionAttachSchema.safeParse(body);
  if (attachParsed.success) {
    const scopeError = await assertQuestionInQuiz(
      attachParsed.data.questionId,
      quizId
    );
    if (scopeError) {
      return NextResponse.json({ error: scopeError }, { status: 400 });
    }

    const existing = await prisma.quizQuestion.findUnique({
      where: {
        quizId_questionId: {
          quizId,
          questionId: attachParsed.data.questionId,
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Câu hỏi đã có trong bài kiểm tra" },
        { status: 400 }
      );
    }

    const link = await attachQuestion(quizId, attachParsed.data.questionId);
    return NextResponse.json(link, { status: 201 });
  }

  const createParsed = quizQuestionCreateSchema.safeParse(body);
  if (!createParsed.success) {
    return NextResponse.json(
      { error: createParsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  const defaultCat = await getOrCreateDefaultCategory(quizId);

  const question = await prisma.question.create({
    data: prismaQuestionDataFromForm(
      createParsed.data,
      defaultCat.id,
      Number(user!.id)
    ),
  });

  const link = await attachQuestion(quizId, question.id);
  return NextResponse.json(link, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const quizQuestionId = searchParams.get("quizQuestionId");
  const questionId = searchParams.get("questionId");

  if (quizQuestionId) {
    const slot = await prisma.quizQuestion.findFirst({
      where: { id: Number(quizQuestionId), quizId: Number(params.id) },
    });
    if (!slot) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.quizQuestion.delete({ where: { id: slot.id } });
    return NextResponse.json({ success: true });
  }

  if (!questionId) {
    return NextResponse.json(
      { error: "quizQuestionId hoặc questionId required" },
      { status: 400 }
    );
  }

  await prisma.quizQuestion.delete({
    where: {
      quizId_questionId: {
        quizId: Number(params.id),
        questionId: Number(questionId),
      },
    },
  });

  return NextResponse.json({ success: true });
}
