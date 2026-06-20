export const QUESTION_TYPES = [
  {
    value: "MULTIPLE_CHOICE",
    label: "Trắc nghiệm một đáp án",
    shortLabel: "Một đáp án",
  },
  {
    value: "MULTIPLE_RESPONSE",
    label: "Trắc nghiệm nhiều đáp án",
    shortLabel: "Nhiều đáp án",
  },
  {
    value: "MATCHING",
    label: "Ghép đôi (Matching)",
    shortLabel: "Ghép đôi",
  },
  {
    value: "FILL_IN_BLANK",
    label: "Điền khuyết (Fill in the Blank)",
    shortLabel: "Điền khuyết",
  },
  {
    value: "ORDERING",
    label: "Sắp xếp thứ tự (Ordering)",
    shortLabel: "Sắp xếp",
  },
  {
    value: "DRAG_AND_DROP",
    label: "Kéo thả (Drag and Drop)",
    shortLabel: "Kéo thả",
  },
  {
    value: "MATRIX",
    label: "Ma trận (Matrix/Grid)",
    shortLabel: "Ma trận",
  },
] as const;

export type QuestionTypeValue = (typeof QUESTION_TYPES)[number]["value"];

export type OptionRoleValue =
  | "CHOICE"
  | "MATCH_PROMPT"
  | "MATCH_ANSWER"
  | "ORDER_ITEM"
  | "DRAG_ITEM"
  | "DROP_ZONE"
  | "MATRIX_ROW"
  | "BLANK_ANSWER";

export type MatrixConfig = {
  columns: { id: string; text: string }[];
};

export type FillBlankConfig = {
  caseSensitive?: boolean;
};

export type StudentAnswerJson = {
  matches?: Record<string, number>;
  blanks?: Record<string, string>;
  order?: number[];
  drops?: Record<string, number>;
  matrix?: Record<string, string>;
};

export function getQuestionTypeLabel(type: string): string {
  return (
    QUESTION_TYPES.find((t) => t.value === type)?.shortLabel ??
    QUESTION_TYPES.find((t) => t.value === type)?.label ??
    type
  );
}

export function isChoiceType(type: string): boolean {
  return type === "MULTIPLE_CHOICE" || type === "MULTIPLE_RESPONSE";
}
