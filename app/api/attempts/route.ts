import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { assertStudentQuizAccess } from "@/lib/quiz-access";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const { error, user } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const quizId = Number(body.quizId);
    if (!quizId) {
        return NextResponse.json({ error: "quizId required" }, { status: 400 });
    }

    const isTeacherOrAdmin =
        user!.role === "TEACHER" || user!.role === "ADMIN";

    if (!isTeacherOrAdmin) {
        const access = await assertStudentQuizAccess(quizId, Number(user!.id));
        if (!access.ok) {
            return NextResponse.json(
                { error: access.error },
                { status: access.status },
            );
        }
    }

    const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: { questions: true },
    });

    if (!quiz) {
        return NextResponse.json(
            { error: "Quiz not available" },
            { status: 404 },
        );
    }

    const existing = await prisma.quizAttempt.findUnique({
        where: {
            quizId_userId: { quizId, userId: Number(user!.id) },
        },
    });

    if (existing?.status === "SUBMITTED") {
        return NextResponse.json(
            { error: "Bạn đã nộp bài kiểm tra này" },
            { status: 400 },
        );
    }

    if (existing?.status === "IN_PROGRESS") {
        return NextResponse.json(existing);
    }

    const attempt = await prisma.quizAttempt.create({
        data: {
            quizId,
            userId: Number(user!.id),
            answers: {
                create: quiz.questions.map((q) => ({
                    questionId: q.questionId,
                })),
            },
        },
    });

    return NextResponse.json(attempt, { status: 201 });
}

export async function GET(request: NextRequest) {
    const { error, user } = await requireAuth();
    if (error) return error;

    const quizId = Number(new URL(request.url).searchParams.get("quizId"));
    const isTeacherOrAdmin = user!.role === "TEACHER" || user!.role === "ADMIN";

    const attempts = await prisma.quizAttempt.findMany({
        where: {
            ...(quizId ? { quizId } : {}),
            ...(isTeacherOrAdmin ? {} : { userId: Number(user!.id) }),
        },
        include: {
            user: { select: { fullName: true, username: true } },
            quiz: { select: { title: true } },
            answers: {
                include: {
                    question: true,
                    selectedOption: true,
                },
            },
        },
        orderBy: { startedAt: "desc" },
    });

    return NextResponse.json(attempts);
}
