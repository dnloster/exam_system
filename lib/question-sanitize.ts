import type { QuestionTypeValue } from "./question-types";
import type { MatrixConfig } from "./question-types";

type SanitizeOption = {
  id: number;
  text: string;
  mediaType?: string | null;
  imageUrl?: string | null;
  isCorrect?: boolean;
  gradePercent?: number;
  sortOrder?: number;
  optionRole?: string;
  groupKey?: string | null;
  matchTarget?: string | null;
};

type SanitizeQuestion = {
  id: number;
  type: string;
  content: string;
  configJson?: unknown;
  shuffleAnswers?: boolean;
  options: SanitizeOption[];
};

export function sanitizeQuestionForStudent(question: SanitizeQuestion) {
  const type = question.type as QuestionTypeValue;

  const base = {
    id: question.id,
    type: question.type,
    content: question.content,
    shuffleAnswers: question.shuffleAnswers,
    configJson: question.configJson,
  };

  if (type === "MULTIPLE_CHOICE" || type === "MULTIPLE_RESPONSE") {
    return {
      ...base,
      multipleResponse: type === "MULTIPLE_RESPONSE",
      options: question.options
        .filter((o) => o.optionRole === "CHOICE" || !o.optionRole)
        .map((o) => ({
        id: o.id,
        text: o.text,
        mediaType: o.mediaType ?? "TEXT",
        imageUrl: o.imageUrl ?? null,
      })),
    };
  }

  if (type === "MATCHING") {
    return {
      ...base,
      options: question.options.map((o) => ({
        id: o.id,
        text: o.text,
        optionRole: o.optionRole,
        sortOrder: o.sortOrder,
      })),
    };
  }

  if (type === "FILL_IN_BLANK") {
    return {
      ...base,
      options: [],
    };
  }

  if (type === "ORDERING") {
    return {
      ...base,
      options: question.options.map((o) => ({
        id: o.id,
        text: o.text,
        optionRole: o.optionRole,
        sortOrder: o.sortOrder,
      })),
    };
  }

  if (type === "DRAG_AND_DROP") {
    return {
      ...base,
      options: question.options.map((o) => ({
        id: o.id,
        text: o.text,
        optionRole: o.optionRole,
        sortOrder: o.sortOrder,
        groupKey: o.groupKey,
      })),
    };
  }

  if (type === "MATRIX") {
    const config = (question.configJson ?? { columns: [] }) as MatrixConfig;
    return {
      ...base,
      configJson: config,
      options: question.options.map((o) => ({
        id: o.id,
        text: o.text,
        optionRole: o.optionRole,
        groupKey: o.groupKey,
        sortOrder: o.sortOrder,
      })),
    };
  }

  return question;
}

export function sanitizeQuestionForTeacher(question: SanitizeQuestion) {
  return {
    ...question,
    multipleResponse:
      question.type === "MULTIPLE_RESPONSE" ||
      (question.type === "MULTIPLE_CHOICE" &&
        question.options.filter((o) => (o.gradePercent ?? 0) > 0).length > 1),
    options: question.options,
  };
}
