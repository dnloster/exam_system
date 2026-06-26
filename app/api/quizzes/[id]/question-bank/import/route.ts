import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageQuestions, assertCommanderQuizAccess } from "@/lib/auth-helpers";
import { aikenImportSchema } from "@/lib/validators";
import { OptionRole, OptionMediaType, QuestionType } from "@prisma/client";
import { parseAiken, aikenToQuestionPayload } from "@/lib/aiken-parser";
import { parseQuestionJsonImport } from "@/lib/question-import-json";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error, user } = await requireAuth();
  if (error) return error;
  if (!canManageQuestions(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quizId = Number(id);
  const accessError = await assertCommanderQuizAccess(quizId, user!);
  if (accessError) return accessError;
  const body = await request.json();
  const parsed = aikenImportSchema.safeParse({
    ...body,
    quizId,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  let categoryId = parsed.data.categoryId ?? null;
  if (!categoryId) {
    const defaultCat = await prisma.questionCategory.findFirst({
      where: { quizId, name: "Mặc định cho bài kiểm tra" },
    });
    const cat =
      defaultCat ??
      (await prisma.questionCategory.create({
        data: { quizId, name: "Mặc định cho bài kiểm tra" },
      }));
    categoryId = cat.id;
  }

  const { questions, errors } =
    parsed.data.format === "json"
      ? parseQuestionJsonImport(parsed.data.content)
      : (() => {
          const r = parseAiken(parsed.data.content);
          return {
            questions: r.questions.map((q) => aikenToQuestionPayload(q)),
            errors: r.errors,
          };
        })();
  if (questions.length === 0) {
    return NextResponse.json(
      { imported: 0, errors: errors.length ? errors : ["Không tìm thấy câu hỏi hợp lệ"] },
      { status: 400 }
    );
  }

  const createdIds: number[] = [];
  const importErrors = [...errors];

  for (let i = 0; i < questions.length; i++) {
    try {
      const payload = questions[i];
      const question = await prisma.question.create({
        data: {
          name: payload.name,
          content: payload.content,
          type: payload.type as QuestionType,
          categoryId,
          points: payload.points,
          shuffleAnswers: payload.shuffleAnswers,
          createdById: Number(user!.id),
          options: {
            create: payload.options.map((o, idx) => ({
              text: o.text,
              mediaType: (o.mediaType ?? "TEXT") as OptionMediaType,
              imageUrl: o.imageUrl ?? null,
              isCorrect: o.isCorrect,
              gradePercent: o.gradePercent,
              sortOrder: o.sortOrder ?? idx,
              optionRole: (o.optionRole ?? "CHOICE") as OptionRole,
            })),
          },
        },
      });
      createdIds.push(question.id);
    } catch (e) {
      importErrors.push(
        `Câu ${i + 1}: ${e instanceof Error ? e.message : "Lỗi lưu"}`
      );
    }
  }

  return NextResponse.json({
    imported: createdIds.length,
    total: questions.length,
    errors: importErrors,
    categoryId,
  });
}
