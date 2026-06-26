import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, commanderQuizListWhere } from "@/lib/auth-helpers";
import { isCommanderOrAdmin } from "@/lib/roles";
import { studentQuizListWhere } from "@/lib/quiz-access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const user = await getSessionUser();

  const textFilter = q
    ? {
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
        ],
      }
    : {};

  let quizWhere: Record<string, unknown> = { id: -1 };

  if (user?.role === "UNIT_MEMBER") {
    quizWhere = {
      ...studentQuizListWhere(Number(user.id)),
      ...textFilter,
    };
  } else if (user && isCommanderOrAdmin(user.role)) {
    quizWhere = {
      ...(user.role === "UNIT_COMMANDER"
        ? commanderQuizListWhere(user)
        : {}),
      ...textFilter,
    };
  }

  const [quizzes, courses] = await Promise.all([
    prisma.quiz.findMany({
      where: quizWhere,
      select: {
        id: true,
        title: true,
        description: true,
        passingScore: true,
        timeLimitMinutes: true,
      },
      take: 20,
    }),
    prisma.course.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q } },
              { code: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : undefined,
      take: 20,
    }),
  ]);

  return NextResponse.json({ quizzes, courses });
}
