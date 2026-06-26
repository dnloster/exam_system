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
  role: z.enum(["ADMIN", "UNIT_COMMANDER", "UNIT_MEMBER"]),
  unitId: z.number().int().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.role === "UNIT_COMMANDER" || data.role === "UNIT_MEMBER") {
    if (data.unitId == null) {
      ctx.addIssue({
        code: "custom",
        message: "Cần chọn đơn vị cho tài khoản",
        path: ["unitId"],
      });
    }
  }
  if (data.role === "ADMIN" && data.unitId != null) {
    ctx.addIssue({
      code: "custom",
      message: "Tài khoản quản trị không gắn đơn vị",
      path: ["unitId"],
    });
  }
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
  unitId: z.number().int().optional().nullable(),
  openAt: z.string().datetime().optional().nullable(),
  closeAt: z.string().datetime().optional().nullable(),
  timeLimitMinutes: z.number().int().min(1).optional().nullable(),
  shuffleQuestions: z.boolean().default(false),
  questionsPerPage: z.number().int().min(0).default(0),
  attemptsAllowed: z.number().int().min(1).default(1),
  passingScore: z.number().int().min(0).max(100).default(50),
  isPublished: z.boolean().default(false),
  accessPassword: z.string().max(128).optional().nullable(),
  removeAccessPassword: z.boolean().optional(),
});

export const attemptStartSchema = z.object({
  quizId: z.number().int(),
  accessPassword: z.string().max(128).optional().nullable(),
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

export const quizQuestionBulkDeleteSchema = z.object({
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
    enrollAllUnitMembers: z.boolean().optional(),
    enrollAllCourseStudents: z.boolean().optional(),
    enrollAllEligible: z.boolean().optional(),
    courseId: z.number().int().optional(),
  })
  .refine(
    (data) =>
      (data.userIds?.length ?? 0) > 0 ||
      data.enrollAllUnitMembers ||
      data.enrollAllCourseStudents ||
      data.enrollAllEligible ||
      data.courseId != null,
    {
      message: "Cần chọn đối tượng ghi danh",
    }
  );

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
