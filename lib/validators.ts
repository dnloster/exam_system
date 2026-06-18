import { z } from "zod";

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

export const questionCreateSchema = z.object({
  name: z.string().optional(),
  content: z.string().min(1),
  category: z.string().optional(),
  categoryId: z.number().int().optional().nullable(),
  quizId: z.number().int().optional().nullable(),
  points: z.number().min(0.1).default(1),
  generalFeedback: z.string().optional(),
  shuffleAnswers: z.boolean().default(false),
  options: z
    .array(questionOptionSchema)
    .min(2, "Cần ít nhất 2 lựa chọn")
    .max(10)
    .refine(
      (opts) => {
        const sum = opts.reduce((s, o) => s + o.gradePercent, 0);
        return Math.abs(sum - 100) < 0.01 && opts.some((o) => o.gradePercent > 0);
      },
      {
        message: "Tổng % điểm các lựa chọn phải bằng 100%",
      }
    ),
});

export const questionUpdateSchema = questionCreateSchema;

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

export const quizQuestionCreateSchema = questionCreateSchema;

export const quizQuestionReorderSchema = z.object({
  questionIds: z.array(z.number().int()).min(1),
});

export const attemptSubmitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.number().int(),
      selectedOptionId: z.number().int().nullable().optional(),
      selectedOptionIds: z.array(z.number().int()).optional(),
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
});

export const questionCategoryCreateSchema = z.object({
  name: z.string().min(1),
});

export function optionsFromGrades(
  options: { text: string; gradePercent: number }[]
) {
  return options.map((o) => ({
    text: o.text,
    gradePercent: o.gradePercent,
    isCorrect: o.gradePercent > 0,
  }));
}
