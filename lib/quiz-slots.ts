import { prisma } from "@/lib/prisma";
import {
  sanitizeQuestionForStudent,
  sanitizeQuestionForTeacher,
} from "@/lib/question-sanitize";
import {
  estimateRandomSlotMaxPoints,
  countRandomPool,
} from "@/lib/random-questions";

type QuizQuestionRow = {
  id: number;
  quizId: number;
  order: number;
  slotType: "FIXED" | "RANDOM";
  questionId: number | null;
  randomCategoryId: number | null;
  includeSubcategories: boolean;
  question: (Parameters<typeof sanitizeQuestionForTeacher>[0] & {
    points: number;
  }) | null;
  randomCategory: { id: number; name: string } | null;
};

export async function enrichQuizQuestionsForResponse(
  quizId: number,
  questions: QuizQuestionRow[],
  options: {
    isTeacherOrAdmin: boolean;
    randomDrawMap?: Map<
      number,
      Parameters<typeof sanitizeQuestionForTeacher>[0] & { points: number }
    >;
  }
) {
  const enriched = await Promise.all(
    questions.map(async (qq) => {
      if (qq.slotType === "RANDOM") {
        const poolSize =
          qq.randomCategoryId != null
            ? await countRandomPool(
                quizId,
                qq.randomCategoryId,
                qq.includeSubcategories
              )
            : 0;
        const estimatedMaxPoints =
          qq.randomCategoryId != null
            ? await estimateRandomSlotMaxPoints(
                quizId,
                qq.randomCategoryId,
                qq.includeSubcategories
              )
            : 0;

        const drawn = options.randomDrawMap?.get(qq.id);
        if (drawn && !options.isTeacherOrAdmin) {
          const sanitized = sanitizeQuestionForStudent(drawn);
          return {
            ...qq,
            questionId: drawn.id,
            question: sanitized,
            poolSize,
            estimatedMaxPoints,
            slotPoints: drawn.points,
            resolvedFromRandom: true,
          };
        }

        return {
          ...qq,
          question: null,
          poolSize,
          estimatedMaxPoints,
          slotPoints: estimatedMaxPoints,
        };
      }

      if (!qq.question) return { ...qq, slotPoints: 0 };

      const sanitized = options.isTeacherOrAdmin
        ? sanitizeQuestionForTeacher(qq.question)
        : sanitizeQuestionForStudent(qq.question);

      return {
        ...qq,
        question: sanitized,
        slotPoints: qq.question.points,
      };
    })
  );

  return enriched;
}

export function computeQuizMaxGrade(
  questions: { slotPoints?: number }[]
) {
  return questions.reduce((sum, q) => sum + (q.slotPoints ?? 0), 0);
}

export async function computeQuizMaxGradeFromDbQuestions(
  quizId: number,
  questions: {
    slotType: "FIXED" | "RANDOM";
    randomCategoryId: number | null;
    includeSubcategories: boolean;
    question: { points: number } | null;
  }[]
) {
  let sum = 0;
  for (const qq of questions) {
    if (qq.slotType === "RANDOM" && qq.randomCategoryId != null) {
      sum += await estimateRandomSlotMaxPoints(
        quizId,
        qq.randomCategoryId,
        qq.includeSubcategories
      );
    } else {
      sum += qq.question?.points ?? 0;
    }
  }
  return sum;
}

export async function loadRandomDrawMapForAttempt(attemptId: number) {
  const draws = await prisma.attemptRandomDraw.findMany({
    where: { attemptId },
    include: {
      question: {
        include: {
          options: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  return new Map(draws.map((d) => [d.quizQuestionId, d.question]));
}
