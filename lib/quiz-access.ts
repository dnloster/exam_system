import { prisma } from "@/lib/prisma";

type QuizSchedule = {
  openAt: Date | null;
  closeAt: Date | null;
};

/** Bài kiểm tra đang trong khung thời gian mở (theo giờ server). */
export function isQuizWithinAvailabilityWindow(
  quiz: QuizSchedule,
  now: Date = new Date()
): boolean {
  if (quiz.openAt && now < quiz.openAt) return false;
  if (quiz.closeAt && now > quiz.closeAt) return false;
  return true;
}

/** Prisma filter: đã mở và chưa đóng (null = không giới hạn). */
export function quizAvailabilityWhere(now: Date = new Date()) {
  return {
    AND: [
      { OR: [{ openAt: null }, { openAt: { lte: now } }] },
      { OR: [{ closeAt: null }, { closeAt: { gt: now } }] },
    ],
  };
}

/** Sinh viên chỉ thấy bài đã xuất bản, được ghi danh và còn trong thời gian mở. */
export function studentQuizListWhere(userId: number, now: Date = new Date()) {
  return {
    isPublished: true,
    participants: { some: { userId } },
    ...quizAvailabilityWhere(now),
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

  const now = new Date();
  if (quiz.openAt && now < quiz.openAt) {
    return {
      ok: false as const,
      error: "Bài kiểm tra chưa đến thời gian mở",
      status: 403,
    };
  }

  if (quiz.closeAt && now > quiz.closeAt) {
    return {
      ok: false as const,
      error: "Bài kiểm tra đã quá thời gian đóng",
      status: 403,
    };
  }

  return { ok: true as const, quiz, enrolled };
}
