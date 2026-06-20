import type { StudentAnswerJson } from "./question-types";
import {
  scoreQuestionAnswer,
  isMultipleResponseQuestion,
} from "./quiz-grading";

type GradingOption = {
  id: number;
  text?: string;
  isCorrect?: boolean;
  gradePercent?: number;
  sortOrder?: number;
  optionRole?: string;
  groupKey?: string | null;
  matchTarget?: string | null;
};

type GradingQuestion = {
  type: string;
  configJson?: unknown;
  options: GradingOption[];
};

function normalizeText(value: string, caseSensitive: boolean) {
  const trimmed = value.trim();
  return caseSensitive ? trimmed : trimmed.toLowerCase();
}

function scoreMatching(
  options: GradingOption[],
  answer: StudentAnswerJson
): number {
  const prompts = options.filter((o) => o.optionRole === "MATCH_PROMPT");
  const matches = answer.matches ?? {};
  if (prompts.length === 0) return 0;

  let earned = 0;
  for (const prompt of prompts) {
    const selectedAnswerId = matches[String(prompt.id)];
    const selected = options.find((o) => o.id === selectedAnswerId);
    if (selected?.groupKey && selected.groupKey === prompt.matchTarget) {
      earned += (prompt.gradePercent ?? 0) / 100;
    }
  }
  return Math.min(1, earned);
}

function scoreFillBlank(
  question: GradingQuestion,
  answer: StudentAnswerJson
): number {
  const config = (question.configJson ?? {}) as { caseSensitive?: boolean };
  const caseSensitive = config.caseSensitive ?? false;
  const blanks = answer.blanks ?? {};
  const blankIds = Array.from(
    new Set(
      question.options
        .filter((o) => o.optionRole === "BLANK_ANSWER")
        .map((o) => o.groupKey)
        .filter(Boolean)
    )
  ) as string[];

  if (blankIds.length === 0) return 0;

  let earned = 0;
  for (const blankId of blankIds) {
    const userText = blanks[blankId] ?? "";
    const accepted = question.options.filter(
      (o) => o.optionRole === "BLANK_ANSWER" && o.groupKey === blankId
    );
    const match = accepted.some(
      (a) =>
        normalizeText(userText, caseSensitive) ===
        normalizeText(a.text ?? "", caseSensitive)
    );
    if (match) {
      earned += 100 / blankIds.length / 100;
    }
  }
  return Math.min(1, earned);
}

function scoreOrdering(
  options: GradingOption[],
  answer: StudentAnswerJson
): number {
  const items = options
    .filter((o) => o.optionRole === "ORDER_ITEM")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const userOrder = answer.order ?? [];
  if (items.length === 0 || userOrder.length !== items.length) return 0;

  let earned = 0;
  items.forEach((item, correctIndex) => {
    if (userOrder[correctIndex] === item.id) {
      earned += (item.gradePercent ?? 0) / 100;
    }
  });
  return Math.min(1, earned);
}

function scoreDragDrop(
  options: GradingOption[],
  answer: StudentAnswerJson
): number {
  const zones = options.filter((o) => o.optionRole === "DROP_ZONE");
  const drops = answer.drops ?? {};
  if (zones.length === 0) return 0;

  let earned = 0;
  for (const zone of zones) {
    const droppedItemId = drops[String(zone.id)];
    const dropped = options.find((o) => o.id === droppedItemId);
    if (dropped?.groupKey && dropped.groupKey === zone.matchTarget) {
      earned += (zone.gradePercent ?? 0) / 100;
    }
  }
  return Math.min(1, earned);
}

function scoreMatrix(
  question: GradingQuestion,
  answer: StudentAnswerJson
): number {
  const rows = question.options.filter((o) => o.optionRole === "MATRIX_ROW");
  const matrix = answer.matrix ?? {};
  if (rows.length === 0) return 0;

  let earned = 0;
  for (const row of rows) {
    const selectedCol = matrix[row.groupKey ?? ""];
    if (selectedCol && selectedCol === row.matchTarget) {
      earned += (row.gradePercent ?? 0) / 100;
    }
  }
  return Math.min(1, earned);
}

export function scoreAnswerForQuestion(
  question: GradingQuestion,
  answer: {
    selectedOptionId?: number | null;
    selectedOptionIds?: number[] | null;
    answerJson?: StudentAnswerJson | null;
  }
): number {
  const type = question.type;
  const answerJson = (answer.answerJson ?? {}) as StudentAnswerJson;

  if (type === "MULTIPLE_CHOICE" || type === "MULTIPLE_RESPONSE") {
    return scoreQuestionAnswer(
      question.options,
      answer.selectedOptionId,
      answer.selectedOptionIds
    );
  }

  if (type === "MATCHING") return scoreMatching(question.options, answerJson);
  if (type === "FILL_IN_BLANK") return scoreFillBlank(question, answerJson);
  if (type === "ORDERING") return scoreOrdering(question.options, answerJson);
  if (type === "DRAG_AND_DROP") return scoreDragDrop(question.options, answerJson);
  if (type === "MATRIX") return scoreMatrix(question, answerJson);

  if (isMultipleResponseQuestion(question.options)) {
    return scoreQuestionAnswer(
      question.options,
      answer.selectedOptionId,
      answer.selectedOptionIds
    );
  }

  return scoreQuestionAnswer(
    question.options,
    answer.selectedOptionId,
    answer.selectedOptionIds
  );
}

export function isAnswerFullyCorrect(scoreFraction: number): boolean {
  return scoreFraction >= 1 - 1e-6;
}

export { isMultipleResponseQuestion };
