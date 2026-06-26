import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions, assertCommanderQuizAccess } from "@/lib/auth-helpers";
import { quizRandomQuestionSchema } from "@/lib/validators";
import {
  validateRandomSlotsCapacity,
} from "@/lib/random-questions";
import { syncQuizQuestionPoints, pointsPerSlot } from "@/lib/quiz-points";

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
  const parsed = quizRandomQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  const { categoryId, count, includeSubcategories } = parsed.data;

  const category = await prisma.questionCategory.findFirst({
    where: { id: categoryId, quizId },
  });
  if (!category) {
    return NextResponse.json(
      { error: "Danh mục không thuộc bài kiểm tra này" },
      { status: 400 }
    );
  }

  const validation = await validateRandomSlotsCapacity(
    quizId,
    categoryId,
    includeSubcategories,
    count
  );
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const maxOrder = await prisma.quizQuestion.aggregate({
    where: { quizId },
    _max: { order: true },
  });
  let order = (maxOrder._max.order ?? -1) + 1;

  const slots = await prisma.$transaction(
    Array.from({ length: count }, () =>
      prisma.quizQuestion.create({
        data: {
          quizId,
          order: order++,
          slotType: "RANDOM",
          randomCategoryId: categoryId,
          includeSubcategories,
        },
        include: {
          randomCategory: true,
        },
      })
    )
  );

  await syncQuizQuestionPoints(quizId);

  const slotCount = await prisma.quizQuestion.count({ where: { quizId } });
  const perSlot = pointsPerSlot(slotCount);

  return NextResponse.json(
    {
      created: slots.length,
      poolSize: validation.poolSize,
      estimatedMaxPoints: perSlot,
      slots: slots.map((s) => ({
        ...s,
        estimatedMaxPoints: perSlot,
      })),
    },
    { status: 201 }
  );
}
