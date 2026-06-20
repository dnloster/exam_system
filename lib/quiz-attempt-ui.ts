import type { QuestionAnswerValue } from "@/components/quiz/QuestionAnswerInput";

type QuestionOption = {
  id: number;
  optionRole?: string;
  groupKey?: string | null;
};

type QuestionLike = {
  id: number;
  type: string;
  options: QuestionOption[];
};

export function isQuestionAnswered(
  question: QuestionLike,
  value: QuestionAnswerValue | undefined
): boolean {
  if (!value) return false;

  if (value.selectedOptionId != null) return true;
  if (value.selectedOptionIds && value.selectedOptionIds.length > 0) return true;

  const json = value.answerJson;
  if (!json) return false;

  if (json.matches) {
    const prompts = question.options.filter(
      (o) => o.optionRole === "MATCH_PROMPT"
    );
    if (prompts.length === 0) return Object.keys(json.matches).length > 0;
    return prompts.every((p) => json.matches![String(p.id)] != null);
  }

  if (json.blanks) {
    return Object.values(json.blanks).some((v) => String(v).trim().length > 0);
  }

  if (json.order && json.order.length > 0) return true;

  if (json.drops && Object.keys(json.drops).length > 0) return true;

  if (json.matrix && Object.keys(json.matrix).length > 0) {
    const rows = question.options.filter((o) => o.optionRole === "MATRIX_ROW");
    if (rows.length === 0) return true;
    return rows.every((r) => r.groupKey && json.matrix![r.groupKey]);
  }

  return false;
}
