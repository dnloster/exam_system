import { z } from "zod";
import type { QuestionTypeValue } from "./question-types";

const jsonChoiceOptionSchema = z.object({
  text: z.string().optional(),
  label: z.string().optional(),
  mediaType: z.enum(["TEXT", "IMAGE"]).optional(),
  imageUrl: z.string().optional(),
  correct: z.boolean().optional(),
  isCorrect: z.boolean().optional(),
  gradePercent: z.number().min(0).max(100).optional(),
});

const jsonQuestionSchema = z.object({
  content: z.string().min(1),
  name: z.string().optional(),
  type: z.enum(["MULTIPLE_CHOICE", "MULTIPLE_RESPONSE"]).optional(),
  points: z.number().min(0.1).optional(),
  shuffleAnswers: z.boolean().optional(),
  options: z.array(jsonChoiceOptionSchema).min(2),
});

export const questionJsonImportSchema = z.object({
  questions: z.array(jsonQuestionSchema).min(1),
});

export type ImportedQuestionPayload = {
  type: QuestionTypeValue;
  content: string;
  name: string;
  points: number;
  shuffleAnswers: boolean;
  options: {
    text: string;
    mediaType: "TEXT" | "IMAGE";
    imageUrl: string | null;
    isCorrect: boolean;
    gradePercent: number;
    sortOrder: number;
    optionRole: "CHOICE";
  }[];
};

export function parseQuestionJsonImport(content: string): {
  questions: ImportedQuestionPayload[];
  errors: string[];
} {
  const errors: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { questions: [], errors: ["JSON không hợp lệ"] };
  }

  const validated = questionJsonImportSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      questions: [],
      errors: [
        validated.error.issues[0]?.message ?? "Cấu trúc JSON không hợp lệ",
      ],
    };
  }

  const questions: ImportedQuestionPayload[] = [];

  validated.data.questions.forEach((q, index) => {
    try {
      const correctFlags = q.options.map(
        (o) => o.correct ?? o.isCorrect ?? false
      );
      const explicitGrades = q.options.some((o) => (o.gradePercent ?? 0) > 0);
      const correctCount = explicitGrades
        ? q.options.filter((o) => (o.gradePercent ?? 0) > 0).length
        : correctFlags.filter(Boolean).length;

      if (correctCount === 0) {
        errors.push(`Câu ${index + 1}: cần ít nhất một đáp án đúng`);
        return;
      }

      const inferredType =
        q.type ??
        (correctCount > 1 ? "MULTIPLE_RESPONSE" : "MULTIPLE_CHOICE");
      const perCorrect = 100 / correctCount;

      const options = q.options.map((o, i) => {
        const mediaType = o.mediaType ?? (o.imageUrl ? "IMAGE" : "TEXT");
        const isCorrect = explicitGrades
          ? (o.gradePercent ?? 0) > 0
          : (o.correct ?? o.isCorrect ?? false);
        const gradePercent = explicitGrades
          ? (o.gradePercent ?? 0)
          : isCorrect
            ? perCorrect
            : 0;

        if (mediaType === "IMAGE" && !o.imageUrl?.trim()) {
          throw new Error(`lựa chọn ${i + 1}: thiếu imageUrl`);
        }
        if (mediaType === "TEXT" && !o.text?.trim()) {
          throw new Error(`lựa chọn ${i + 1}: thiếu text`);
        }

        return {
          text:
            mediaType === "IMAGE"
              ? o.text?.trim() || o.label?.trim() || "Hình ảnh"
              : o.text!.trim(),
          mediaType,
          imageUrl: mediaType === "IMAGE" ? o.imageUrl!.trim() : null,
          isCorrect,
          gradePercent,
          sortOrder: i,
          optionRole: "CHOICE" as const,
        };
      });

      const gradeSum = options.reduce((s, o) => s + o.gradePercent, 0);
      if (Math.abs(gradeSum - 100) > 0.05) {
        errors.push(
          `Câu ${index + 1}: tổng gradePercent phải bằng 100 (hiện ${gradeSum.toFixed(1)})`
        );
        return;
      }

      questions.push({
        type: inferredType,
        content: q.content,
        name: q.name ?? q.content.split("\n")[0].slice(0, 100),
        points: q.points ?? 1,
        shuffleAnswers: q.shuffleAnswers ?? false,
        options,
      });
    } catch (e) {
      errors.push(
        `Câu ${index + 1}: ${e instanceof Error ? e.message : "Lỗi dữ liệu"}`
      );
    }
  });

  return { questions, errors };
}
