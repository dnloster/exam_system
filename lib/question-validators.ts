import { z } from "zod";
import { QUESTION_TYPES } from "./question-types";

const questionTypeEnum = z.enum(
  QUESTION_TYPES.map((t) => t.value) as [
    (typeof QUESTION_TYPES)[number]["value"],
    ...(typeof QUESTION_TYPES)[number]["value"][],
  ]
);

const baseFields = {
  name: z.string().optional(),
  content: z.string().min(1),
  category: z.string().optional(),
  categoryId: z.number().int().optional().nullable(),
  quizId: z.number().int().optional().nullable(),
  points: z.number().min(0.1).default(1),
  generalFeedback: z.string().optional(),
  shuffleAnswers: z.boolean().default(false),
};

const choiceOptionSchema = z
  .object({
    text: z.string(),
    gradePercent: z.number().min(0).max(100),
    mediaType: z.enum(["TEXT", "IMAGE"]).optional(),
    imageUrl: z.string().optional(),
  })
  .refine(
    (o) =>
      o.mediaType === "IMAGE"
        ? !!(o.imageUrl?.trim() || o.text.trim())
        : o.text.trim().length >= 1,
    { message: "Lựa chọn cần nội dung hoặc URL hình ảnh" }
  );

const choiceOptionsSchema = z
  .array(choiceOptionSchema)
  .min(2, "Cần ít nhất 2 lựa chọn")
  .max(10)
  .refine(
    (opts) => {
      const sum = opts.reduce((s, o) => s + o.gradePercent, 0);
      return Math.abs(sum - 100) < 0.01 && opts.some((o) => o.gradePercent > 0);
    },
    { message: "Tổng % điểm các lựa chọn phải bằng 100%" }
  );

export const questionFormSchema = z.discriminatedUnion("type", [
  z.object({
    ...baseFields,
    type: z.enum(["MULTIPLE_CHOICE", "MULTIPLE_RESPONSE"]),
    options: choiceOptionsSchema,
  }),
  z.object({
    ...baseFields,
    type: z.literal("MATCHING"),
    matchPairs: z
      .array(
        z.object({
          prompt: z.string().min(1),
          answer: z.string().min(1),
        })
      )
      .min(2, "Cần ít nhất 2 cặp ghép"),
  }),
  z.object({
    ...baseFields,
    type: z.literal("FILL_IN_BLANK"),
    blankAnswers: z
      .record(z.string(), z.array(z.string().min(1)).min(1))
      .refine((obj) => Object.keys(obj).length > 0, "Cần ít nhất 1 ô trống"),
    fillBlankCaseSensitive: z.boolean().optional(),
  }),
  z.object({
    ...baseFields,
    type: z.literal("ORDERING"),
    orderItems: z.array(z.string().min(1)).min(2, "Cần ít nhất 2 mục"),
  }),
  z.object({
    ...baseFields,
    type: z.literal("DRAG_AND_DROP"),
    dragItems: z.array(z.string().min(1)).min(1, "Cần ít nhất 1 mục kéo"),
    dropZones: z
      .array(
        z.object({
          label: z.string().min(1),
          correctItemIndex: z.number().int().min(0),
        })
      )
      .min(1, "Cần ít nhất 1 vùng thả"),
  }),
  z.object({
    ...baseFields,
    type: z.literal("MATRIX"),
    matrixColumns: z.array(z.string().min(1)).min(2, "Cần ít nhất 2 cột"),
    matrixRows: z
      .array(
        z.object({
          text: z.string().min(1),
          correctColumnIndex: z.number().int().min(0),
        })
      )
      .min(1, "Cần ít nhất 1 dòng"),
  }),
]);

export type QuestionFormInput = z.infer<typeof questionFormSchema>;

export const questionCreateSchema = questionFormSchema;
export const questionUpdateSchema = questionFormSchema;

export { questionTypeEnum };
