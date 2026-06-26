import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { isCommanderOrAdmin } from "@/lib/roles";
import { assertStudentQuizAccess } from "@/lib/quiz-access";
import { resolveRandomDrawsForAttempt } from "@/lib/random-questions";
import { attemptStartSchema } from "@/lib/validators";
import { verifyQuizAccessPassword } from "@/lib/quiz-access-password";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const { error, user } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const parsed = attemptStartSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const quizId = parsed.data.quizId;

    const isManager = isCommanderOrAdmin(user!.role);

    if (!isManager) {
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
        include: {
            questions: {
                orderBy: { order: "asc" },
            },
        },
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

    if (
        !isManager &&
        quiz.accessPasswordHash &&
        !(await verifyQuizAccessPassword(
            parsed.data.accessPassword ?? "",
            quiz.accessPasswordHash
        ))
    ) {
        return NextResponse.json(
            { error: "Mật khẩu vào thi không đúng" },
            { status: 403 }
        );
    }

    const fixedSlots = quiz.questions.filter(
        (q) => q.slotType === "FIXED" && q.questionId != null
    );
    const randomSlots = quiz.questions.filter(
        (q) => q.slotType === "RANDOM" && q.randomCategoryId != null
    );

    let randomDraws: { slotId: number; questionId: number }[] = [];
    try {
        randomDraws = await resolveRandomDrawsForAttempt(
            quizId,
            randomSlots.map((s) => ({
                id: s.id,
                randomCategoryId: s.randomCategoryId!,
                includeSubcategories: s.includeSubcategories,
            }))
        );
    } catch (e) {
        return NextResponse.json(
            {
                error:
                    e instanceof Error
                        ? e.message
                        : "Không thể rút câu hỏi ngẫu nhiên",
            },
            { status: 400 }
        );
    }

    const answerQuestionIds = [
        ...fixedSlots.map((q) => q.questionId!),
        ...randomDraws.map((d) => d.questionId),
    ];

    const attempt = await prisma.quizAttempt.create({
        data: {
            quizId,
            userId: Number(user!.id),
            randomDraws: {
                create: randomDraws.map((d) => ({
                    quizQuestionId: d.slotId,
                    questionId: d.questionId,
                })),
            },
            answers: {
                create: answerQuestionIds.map((questionId) => ({
                    questionId,
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
    const isManager = isCommanderOrAdmin(user!.role);

    const attempts = await prisma.quizAttempt.findMany({
        where: {
            ...(quizId ? { quizId } : {}),
            ...(isManager ? {} : { userId: Number(user!.id) }),
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
