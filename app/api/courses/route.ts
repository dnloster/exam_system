import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { isCommanderOrAdmin } from "@/lib/roles";
import { studentQuizListWhere } from "@/lib/quiz-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  const isManager = user != null && isCommanderOrAdmin(user.role);

  const studentQuizFilter =
    user?.role === "UNIT_MEMBER"
      ? studentQuizListWhere(Number(user.id))
      : { isPublished: true };

  const courses = await prisma.course.findMany({
    include: {
      quizzes: isManager
        ? true
        : {
            where: studentQuizFilter,
            select: { id: true, title: true },
          },
      ...(isManager
        ? { _count: { select: { enrollments: true } } }
        : {}),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(courses);
}
