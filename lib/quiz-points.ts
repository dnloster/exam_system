import { prisma } from "@/lib/prisma";

/** Tổng điểm chuẩn của mỗi bài kiểm tra. */
export const QUIZ_TOTAL_POINTS = 10;

export function pointsPerSlot(slotCount: number): number {
  if (slotCount <= 0) return 0;
  return QUIZ_TOTAL_POINTS / slotCount;
}

export function formatQuizPoints(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * Cập nhật điểm từng câu = 10 / số slot trong đề (câu cố định + slot ngẫu nhiên).
 */
export async function syncQuizQuestionPoints(quizId: number) {
  const slotCount = await prisma.quizQuestion.count({ where: { quizId } });
  if (slotCount === 0) {
    return { slotCount: 0, pointsPerQuestion: 0, total: 0 };
  }

  const pts = pointsPerSlot(slotCount);

  const slots = await prisma.quizQuestion.findMany({
    where: { quizId },
    select: { questionId: true },
  });
  const fixedQuestionIds = slots
    .map((s) => s.questionId)
    .filter((id): id is number => id != null);

  const categories = await prisma.questionCategory.findMany({
    where: { quizId },
    select: { id: true },
  });
  const categoryIds = categories.map((c) => c.id);

  await prisma.$transaction([
    ...(fixedQuestionIds.length > 0
      ? [
          prisma.question.updateMany({
            where: { id: { in: fixedQuestionIds } },
            data: { points: pts },
          }),
        ]
      : []),
    ...(categoryIds.length > 0
      ? [
          prisma.question.updateMany({
            where: { categoryId: { in: categoryIds } },
            data: { points: pts },
          }),
        ]
      : []),
  ]);

  return {
    slotCount,
    pointsPerQuestion: pts,
    total: QUIZ_TOTAL_POINTS,
  };
}

export async function getQuizSlotCount(quizId: number) {
  return prisma.quizQuestion.count({ where: { quizId } });
}
