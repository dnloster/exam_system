import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { studentQuizListWhere } from "@/lib/quiz-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  const isTeacherOrAdmin =
    user?.role === "TEACHER" || user?.role === "ADMIN";

  const studentQuizFilter =
    user?.role === "STUDENT"
      ? studentQuizListWhere(Number(user.id))
      : { isPublished: true };

  const courses = await prisma.course.findMany({
    include: {
      quizzes: isTeacherOrAdmin
        ? true
        : {
            where: studentQuizFilter,
            select: { id: true, title: true },
          },
      ...(isTeacherOrAdmin
        ? { _count: { select: { enrollments: true } } }
        : {}),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(courses);
}
