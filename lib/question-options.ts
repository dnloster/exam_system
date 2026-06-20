export type StoredOption = {
  text: string;
  isCorrect?: boolean;
  gradePercent?: number;
};

export type EditorOption = {
  text: string;
  gradePercent: number;
  mediaType?: "TEXT" | "IMAGE";
  imageUrl?: string;
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
  options: {
    text: string;
    isCorrect?: boolean;
    gradePercent?: number;
    mediaType?: string | null;
    imageUrl?: string | null;
  }[]
): EditorOption[] {
  const hasStoredGrades = options.some((o) => (o.gradePercent ?? 0) > 0);
  const toEditor = (o: (typeof options)[0]) => ({
    text: o.text,
    gradePercent: o.gradePercent ?? 0,
    mediaType: (o.mediaType === "IMAGE" ? "IMAGE" : "TEXT") as "TEXT" | "IMAGE",
    imageUrl: o.imageUrl ?? undefined,
  });

  if (hasStoredGrades) {
    return options.map((o) => toEditor(o));
  }

  const correctIndices = options
    .map((o, i) => (o.isCorrect ? i : -1))
    .filter((i) => i >= 0);

  return redistributeGrades(
    options.map((o) => ({
      text: o.text,
      gradePercent: 0,
      mediaType: (o.mediaType === "IMAGE" ? "IMAGE" : "TEXT") as "TEXT" | "IMAGE",
      imageUrl: o.imageUrl ?? undefined,
    })),
    correctIndices
  );
}

export function gradesToStoredOptions(options: EditorOption[]) {
  return options.map((o) => ({
    text: o.mediaType === "IMAGE" ? o.text || "Hình ảnh" : o.text,
    gradePercent: o.gradePercent,
    isCorrect: o.gradePercent > 0,
    mediaType: o.mediaType ?? "TEXT",
    imageUrl: o.mediaType === "IMAGE" ? o.imageUrl ?? null : null,
  }));
}
