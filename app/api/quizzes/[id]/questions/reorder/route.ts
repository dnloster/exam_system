import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions, assertCommanderQuizAccess } from "@/lib/auth-helpers";
import { quizQuestionReorderSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = quizQuestionReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const quizId = Number(id);
  const accessError = await assertCommanderQuizAccess(quizId, user!);
  if (accessError) return accessError;

  await prisma.$transaction(
    parsed.data.slotIds.map((slotId, index) =>
      prisma.quizQuestion.update({
        where: { id: slotId },
        data: { order: index },
      })
    )
  );

  const questions = await prisma.quizQuestion.findMany({
    where: { quizId },
    include: {
      question: { include: { options: true } },
      randomCategory: true,
    },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(questions);
}
