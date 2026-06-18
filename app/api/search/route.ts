import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
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

  if (user?.role === "STUDENT") {
    quizWhere = {
      ...studentQuizListWhere(Number(user.id)),
      ...textFilter,
    };
  } else if (user?.role === "TEACHER" || user?.role === "ADMIN") {
    quizWhere = {
      isPublished: true,
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
