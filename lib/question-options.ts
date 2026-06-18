export type StoredOption = {
  text: string;
  isCorrect?: boolean;
  gradePercent?: number;
};

export type EditorOption = {
  text: string;
  gradePercent: number;
};

/** Chia đều 100% cho các lựa chọn được đánh dấu đúng */
export function redistributeGrades(
  options: EditorOption[],
  correctIndices: number[]
): EditorOption[] {
  const unique = Array.from(new Set(correctIndices));
  if (unique.length === 0) {
    return options.map((o) => ({ ...o, gradePercent: 0 }));
  }
  const each = 100 / unique.length;
  const correctSet = new Set(unique);
  return options.map((o, i) => ({
    ...o,
    gradePercent: correctSet.has(i) ? each : 0,
  }));
}

/** Chuyển options DB → editor, xử lý dữ liệu cũ chỉ có isCorrect */
export function optionsToEditorGrades(
  options: { text: string; isCorrect: boolean; gradePercent?: number }[]
): EditorOption[] {
  const hasStoredGrades = options.some((o) => (o.gradePercent ?? 0) > 0);
  if (hasStoredGrades) {
    return options.map((o) => ({
      text: o.text,
      gradePercent: o.gradePercent ?? 0,
    }));
  }

  const correctIndices = options
    .map((o, i) => (o.isCorrect ? i : -1))
    .filter((i) => i >= 0);

  return redistributeGrades(
    options.map((o) => ({ text: o.text, gradePercent: 0 })),
    correctIndices
  );
}

export function gradesToStoredOptions(options: EditorOption[]) {
  return options.map((o) => ({
    text: o.text,
    gradePercent: o.gradePercent,
    isCorrect: o.gradePercent > 0,
  }));
}
