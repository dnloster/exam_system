import { OptionRole, OptionMediaType, QuestionType } from "@prisma/client";
import type { QuestionFormInput } from "./question-validators";
import { formToDbPayload } from "./question-payload";

function mapOptionRole(role: string): OptionRole {
  return role as OptionRole;
}

function mapOptions(options: ReturnType<typeof formToDbPayload>["options"]) {
  return options.map((o) => ({
    text: o.text,
    mediaType: (o.mediaType ?? "TEXT") as OptionMediaType,
    imageUrl: o.imageUrl ?? null,
    isCorrect: o.isCorrect,
    gradePercent: o.gradePercent,
    sortOrder: o.sortOrder,
    optionRole: mapOptionRole(o.optionRole),
    groupKey: o.groupKey ?? null,
    matchTarget: o.matchTarget ?? null,
  }));
}

export function prismaQuestionDataFromForm(
  data: QuestionFormInput,
  categoryId: number,
  createdById: number
) {
  const db = formToDbPayload(data);
  return {
    name: data.name,
    content: data.content,
    type: db.type as QuestionType,
    configJson: db.configJson ?? undefined,
    categoryId,
    points: Math.round(data.points),
    generalFeedback: data.generalFeedback,
    shuffleAnswers: data.shuffleAnswers,
    createdById,
    options: { create: mapOptions(db.options) },
  };
}

export function prismaQuestionUpdateFromForm(data: QuestionFormInput) {
  const db = formToDbPayload(data);
  return {
    name: data.name,
    content: data.content,
    type: db.type as QuestionType,
    configJson: db.configJson ?? undefined,
    ...(data.categoryId != null ? { categoryId: data.categoryId } : {}),
    points: Math.round(data.points),
    generalFeedback: data.generalFeedback,
    shuffleAnswers: data.shuffleAnswers,
    options: { create: mapOptions(db.options) },
  };
}
