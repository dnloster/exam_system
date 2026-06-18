import { prisma } from "@/lib/prisma";

/** Sinh viên chỉ thấy bài kiểm tra đã xuất bản và được ghi danh (giống Moodle). */
export function studentQuizListWhere(userId: number) {
  return {
    isPublished: true,
    participants: { some: { userId } },
  };
}

export async function isStudentEnrolledInQuiz(
  quizId: number,
  userId: number
): Promise<boolean> {
  const participant = await prisma.quizParticipant.findUnique({
    where: { quizId_userId: { quizId, userId } },
  });
  return !!participant;
}

export async function assertStudentQuizAccess(quizId: number, userId: number) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) {
    return {
      ok: false as const,
      error: "Not found",
      status: 404,
    };
  }

  const enrolled = await isStudentEnrolledInQuiz(quizId, userId);
  if (!enrolled) {
    return {
      ok: false as const,
      error: "Bạn chưa được ghi danh vào bài kiểm tra này",
      status: 403,
    };
  }

  if (!quiz.isPublished) {
    return {
      ok: false as const,
      error: "Bài kiểm tra chưa được mở",
      status: 403,
    };
  }

  return { ok: true as const, quiz, enrolled };
}
