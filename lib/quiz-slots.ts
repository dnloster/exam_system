import { prisma } from "@/lib/prisma";
import {
  sanitizeQuestionForStudent,
  sanitizeQuestionForTeacher,
} from "@/lib/question-sanitize";
import {
  countRandomPool,
} from "@/lib/random-questions";
import {
  QUIZ_TOTAL_POINTS,
  pointsPerSlot,
} from "@/lib/quiz-points";

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
  const perSlot = pointsPerSlot(questions.length);

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
        const estimatedMaxPoints = perSlot;

        const drawn = options.randomDrawMap?.get(qq.id);
        if (drawn && !options.isTeacherOrAdmin) {
          const sanitized = sanitizeQuestionForStudent({
            ...drawn,
            points: perSlot,
          });
          return {
            ...qq,
            questionId: drawn.id,
            question: sanitized,
            poolSize,
            estimatedMaxPoints,
            slotPoints: perSlot,
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
        ? sanitizeQuestionForTeacher({ ...qq.question, points: perSlot })
        : sanitizeQuestionForStudent({ ...qq.question, points: perSlot });

      return {
        ...qq,
        question: sanitized,
        slotPoints: perSlot,
      };
    })
  );

  return enriched;
}

export function computeQuizMaxGrade(
  questions: { slotPoints?: number }[]
) {
  if (questions.length === 0) return 0;
  return QUIZ_TOTAL_POINTS;
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
  if (questions.length === 0) return 0;
  return QUIZ_TOTAL_POINTS;
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
