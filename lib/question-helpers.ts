import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORY_NAME = "Mặc định cho bài kiểm tra";

export { DEFAULT_CATEGORY_NAME };

export async function getOrCreateDefaultCategory(quizId: number) {
  const existing = await prisma.questionCategory.findFirst({
    where: { quizId, name: DEFAULT_CATEGORY_NAME },
  });
  if (existing) return existing;

  return prisma.questionCategory.create({
    data: { quizId, name: DEFAULT_CATEGORY_NAME },
  });
}

export async function questionBelongsToQuiz(
  questionId: number,
  quizId: number
): Promise<boolean> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { questionCategory: { select: { quizId: true } } },
  });
  return question?.questionCategory?.quizId === quizId;
}

export async function assertQuestionInQuiz(
  questionId: number,
  quizId: number
): Promise<string | null> {
  const belongs = await questionBelongsToQuiz(questionId, quizId);
  if (!belongs) {
    return "Câu hỏi không thuộc ngân hàng của bài kiểm tra này";
  }
  return null;
}
