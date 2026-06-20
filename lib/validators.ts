import { z } from "zod";
import { questionCreateSchema } from "./question-validators";

export const loginSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập kí danh"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const userCreateSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  fullName: z.string().min(1),
  role: z.enum(["ADMIN", "TEACHER", "STUDENT"]),
});

export const questionOptionSchema = z.object({
  text: z.string().min(1),
  gradePercent: z.number().min(0).max(100),
});

export {
  questionFormSchema,
  questionCreateSchema,
  questionUpdateSchema,
} from "./question-validators";

export const quizCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  courseId: z.number().int().optional().nullable(),
  openAt: z.string().datetime().optional().nullable(),
  closeAt: z.string().datetime().optional().nullable(),
  timeLimitMinutes: z.number().int().min(1).optional().nullable(),
  shuffleQuestions: z.boolean().default(false),
  questionsPerPage: z.number().int().min(0).default(0),
  attemptsAllowed: z.number().int().min(1).default(1),
  passingScore: z.number().int().min(0).max(100).default(50),
  isPublished: z.boolean().default(false),
});

export const quizUpdateSchema = quizCreateSchema.partial();

export const quizQuestionAttachSchema = z.object({
  questionId: z.number().int(),
});

export const quizQuestionAttachBatchSchema = z.object({
  questionIds: z.array(z.number().int()).min(1),
});

export const quizQuestionCreateSchema = questionCreateSchema;

export const quizQuestionReorderSchema = z.object({
  slotIds: z.array(z.number().int()).min(1),
});

export const quizRandomQuestionSchema = z.object({
  categoryId: z.number().int(),
  count: z.number().int().min(1).max(50),
  includeSubcategories: z.boolean().default(false),
});

export const attemptSubmitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.number().int(),
      selectedOptionId: z.number().int().nullable().optional(),
      selectedOptionIds: z.array(z.number().int()).optional(),
      answerJson: z.record(z.string(), z.unknown()).optional(),
    })
  ),
});

export const quizParticipantEnrolSchema = z
  .object({
    userIds: z.array(z.number().int()).optional(),
    courseId: z.number().int().optional(),
  })
  .refine((data) => (data.userIds?.length ?? 0) > 0 || data.courseId, {
    message: "Cần userIds hoặc courseId",
  });

export const aikenImportSchema = z.object({
  content: z.string().min(1),
  categoryId: z.number().int().optional().nullable(),
  quizId: z.number().int().optional().nullable(),
  format: z.enum(["aiken", "json"]).optional().default("aiken"),
});

export const questionCategoryCreateSchema = z.object({
  name: z.string().min(1),
  parentId: z.number().int().nullable().optional(),
});

export const questionCategoryUpdateSchema = questionCategoryCreateSchema;

export function optionsFromGrades(
  options: { text: string; gradePercent: number }[]
) {
  return options.map((o) => ({
    text: o.text,
    gradePercent: o.gradePercent,
    isCorrect: o.gradePercent > 0,
  }));
}
