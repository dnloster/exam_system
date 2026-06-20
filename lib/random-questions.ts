import { prisma } from "@/lib/prisma";
import { getDescendantIds } from "@/lib/category-tree";

type RandomSlotInput = {
  id: number;
  randomCategoryId: number;
  includeSubcategories: boolean;
};

export async function getFixedQuestionIdsInQuiz(
  quizId: number
): Promise<number[]> {
  const rows = await prisma.quizQuestion.findMany({
    where: { quizId, slotType: "FIXED", questionId: { not: null } },
    select: { questionId: true },
  });
  return rows.map((r) => r.questionId!);
}

export async function getRandomPoolQuestionIds(
  quizId: number,
  categoryId: number,
  includeSubcategories: boolean,
  excludeQuestionIds: number[]
): Promise<number[]> {
  const exclude = new Set(excludeQuestionIds);

  let categoryFilter: { categoryId?: number | { in: number[] } } = {
    categoryId,
  };

  if (includeSubcategories) {
    const categories = await prisma.questionCategory.findMany({
      where: { quizId },
      select: { id: true, parentId: true },
    });
    categoryFilter = {
      categoryId: {
        in: Array.from(getDescendantIds(categoryId, categories)),
      },
    };
  }

  const questions = await prisma.question.findMany({
    where: {
      questionCategory: { quizId },
      ...categoryFilter,
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  return questions.map((q) => q.id).filter((id) => !exclude.has(id));
}

export async function countRandomPool(
  quizId: number,
  categoryId: number,
  includeSubcategories: boolean
): Promise<number> {
  const fixedIds = await getFixedQuestionIdsInQuiz(quizId);
  const pool = await getRandomPoolQuestionIds(
    quizId,
    categoryId,
    includeSubcategories,
    fixedIds
  );
  return pool.length;
}

export async function estimateRandomSlotMaxPoints(
  quizId: number,
  categoryId: number,
  includeSubcategories: boolean
): Promise<number> {
  const fixedIds = await getFixedQuestionIdsInQuiz(quizId);
  let categoryFilter: { categoryId?: number | { in: number[] } } = {
    categoryId,
  };

  if (includeSubcategories) {
    const categories = await prisma.questionCategory.findMany({
      where: { quizId },
      select: { id: true, parentId: true },
    });
    categoryFilter = {
      categoryId: {
        in: Array.from(getDescendantIds(categoryId, categories)),
      },
    };
  }

  const agg = await prisma.question.aggregate({
    where: {
      questionCategory: { quizId },
      ...categoryFilter,
      id: { notIn: fixedIds.length > 0 ? fixedIds : undefined },
    },
    _max: { points: true },
  });

  return agg._max.points ?? 0;
}

export function drawUniqueFromPools(
  slots: RandomSlotInput[],
  poolBySlotId: Map<number, number[]>,
  globalExclude: Set<number>
): { slotId: number; questionId: number }[] {
  const used = new Set(globalExclude);
  const results: { slotId: number; questionId: number }[] = [];

  for (const slot of slots) {
    const pool = (poolBySlotId.get(slot.id) ?? []).filter((id) => !used.has(id));
    if (pool.length === 0) {
      throw new Error(
        "Không đủ câu hỏi trong ngân hàng để rút ngẫu nhiên. Hãy thêm câu hỏi vào danh mục hoặc giảm số slot ngẫu nhiên."
      );
    }
    const picked = pool[Math.floor(Math.random() * pool.length)];
    used.add(picked);
    results.push({ slotId: slot.id, questionId: picked });
  }

  return results;
}

export async function resolveRandomDrawsForAttempt(
  quizId: number,
  randomSlots: RandomSlotInput[]
): Promise<{ slotId: number; questionId: number }[]> {
  if (randomSlots.length === 0) return [];

  const fixedIds = await getFixedQuestionIdsInQuiz(quizId);
  const globalExclude = new Set(fixedIds);
  const poolBySlotId = new Map<number, number[]>();

  for (const slot of randomSlots) {
    const pool = await getRandomPoolQuestionIds(
      quizId,
      slot.randomCategoryId,
      slot.includeSubcategories,
      Array.from(globalExclude)
    );
    poolBySlotId.set(slot.id, pool);
  }

  return drawUniqueFromPools(randomSlots, poolBySlotId, globalExclude);
}

export async function validateRandomSlotsCapacity(
  quizId: number,
  categoryId: number,
  includeSubcategories: boolean,
  newSlotCount: number
): Promise<{ ok: true; poolSize: number } | { ok: false; error: string }> {
  const poolSize = await countRandomPool(
    quizId,
    categoryId,
    includeSubcategories
  );

  if (poolSize === 0) {
    return {
      ok: false,
      error: "Danh mục không còn câu hỏi khả dụng (các câu đã có trong đề sẽ bị loại trừ).",
    };
  }

  if (newSlotCount > poolSize) {
    return {
      ok: false,
      error: `Chỉ còn ${poolSize} câu hỏi khả dụng trong danh mục. Không thể thêm ${newSlotCount} slot ngẫu nhiên.`,
    };
  }

  const existingRandom = await prisma.quizQuestion.count({
    where: { quizId, slotType: "RANDOM", randomCategoryId: categoryId },
  });

  if (existingRandom + newSlotCount > poolSize) {
    return {
      ok: false,
      error: `Tổng slot ngẫu nhiên từ danh mục này (${existingRandom + newSlotCount}) vượt quá ${poolSize} câu khả dụng.`,
    };
  }

  return { ok: true, poolSize };
}
