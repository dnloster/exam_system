import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  canManageQuestions,
  assertCommanderQuizAccess,
} from "@/lib/auth-helpers";
import { quizQuestionBulkDeleteSchema } from "@/lib/validators";
import { syncQuizQuestionPoints } from "@/lib/quiz-points";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quizId = Number(id);
  const accessError = await assertCommanderQuizAccess(quizId, user!);
  if (accessError) return accessError;

  const body = await request.json();
  const parsed = quizQuestionBulkDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const uniqueIds = Array.from(new Set(parsed.data.slotIds));
  const slots = await prisma.quizQuestion.findMany({
    where: { id: { in: uniqueIds }, quizId },
    select: { id: true },
  });

  if (slots.length !== uniqueIds.length) {
    return NextResponse.json(
      { error: "Một hoặc nhiều câu hỏi không thuộc bài kiểm tra này" },
      { status: 400 }
    );
  }

  const result = await prisma.quizQuestion.deleteMany({
    where: { id: { in: uniqueIds }, quizId },
  });

  await syncQuizQuestionPoints(quizId);

  return NextResponse.json({ deleted: result.count });
}
