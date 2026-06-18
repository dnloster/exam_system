type QuestionOption = {
  id: number;
  gradePercent?: number;
  isCorrect?: boolean;
};

function normalizeOptions(
  options: QuestionOption[]
): { id: number; gradePercent: number }[] {
  const hasGrades = options.some((o) => (o.gradePercent ?? 0) > 0);
  if (hasGrades) {
    return options.map((o) => ({
      id: o.id,
      gradePercent: o.gradePercent ?? 0,
    }));
  }

  const correctCount = options.filter((o) => o.isCorrect).length;
  const each = correctCount > 0 ? 100 / correctCount : 0;
  return options.map((o) => ({
    id: o.id,
    gradePercent: o.isCorrect ? each : 0,
  }));
}

export function isMultipleResponseQuestion(
  options: QuestionOption[]
): boolean {
  const normalized = normalizeOptions(options);
  return normalized.filter((o) => o.gradePercent > 0).length > 1;
}

/** Tỷ lệ điểm đạt được cho câu hỏi (0–1), hỗ trợ chấm từng phần */
export function scoreQuestionAnswer(
  options: QuestionOption[],
  selectedOptionId?: number | null,
  selectedOptionIds?: number[] | null
): number {
  const normalized = normalizeOptions(options);
  const selectedIds = (
    selectedOptionIds?.length
      ? selectedOptionIds
      : selectedOptionId != null
        ? [selectedOptionId]
        : []
  ).sort((a, b) => a - b);

  if (selectedIds.length === 0) return 0;

  const selectedSet = new Set(selectedIds);
  let fraction = 0;

  for (const opt of normalized) {
    if (selectedSet.has(opt.id)) {
      fraction += opt.gradePercent / 100;
    }
  }

  return Math.min(1, Math.max(0, fraction));
}

export function gradeQuestionAnswer(
  options: QuestionOption[],
  selectedOptionId?: number | null,
  selectedOptionIds?: number[] | null
): boolean {
  return scoreQuestionAnswer(options, selectedOptionId, selectedOptionIds) >= 1 - 1e-6;
}

export function parseSelectedOptionIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is number => typeof id === "number");
}
