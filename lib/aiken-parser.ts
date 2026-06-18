export type ParsedAikenOption = {
  label: string;
  text: string;
};

export type ParsedAikenQuestion = {
  content: string;
  options: ParsedAikenOption[];
  answerLabels: string[];
};

export type AikenParseResult = {
  questions: ParsedAikenQuestion[];
  errors: string[];
};

const OPTION_RE = /^([A-Z])[.)]\s+(.+)$/i;
const ANSWER_RE = /^ANSWER:\s*(.+)$/i;

/** Parse ANSWER value: A | A,D | A, D | A;D | AD */
export function parseAnswerLabels(raw: string): string[] {
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return [];

  if (/[,;]/.test(trimmed)) {
    return trimmed
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter((s) => /^[A-Z]$/.test(s));
  }

  if (/\s/.test(trimmed)) {
    return trimmed
      .split(/\s+/)
      .filter((s) => /^[A-Z]$/.test(s));
  }

  if (trimmed.length > 1 && /^[A-Z]+$/.test(trimmed)) {
    return trimmed.split("");
  }

  if (/^[A-Z]$/.test(trimmed)) {
    return [trimmed];
  }

  return [];
}

export function parseAiken(content: string): AikenParseResult {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return { questions: [], errors: ["File trống"] };
  }

  const blocks = normalized.split(/\n\s*\n+/);
  const questions: ParsedAikenQuestion[] = [];
  const errors: string[] = [];

  blocks.forEach((block, index) => {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const options: ParsedAikenOption[] = [];
    const questionLines: string[] = [];
    let answerLabels: string[] = [];

    for (const line of lines) {
      const answerMatch = line.match(ANSWER_RE);
      if (answerMatch) {
        answerLabels = parseAnswerLabels(answerMatch[1]);
        continue;
      }

      const optionMatch = line.match(OPTION_RE);
      if (optionMatch) {
        options.push({
          label: optionMatch[1].toUpperCase(),
          text: optionMatch[2].trim(),
        });
        continue;
      }

      if (options.length === 0) {
        questionLines.push(line);
      } else {
        errors.push(
          `Câu ${index + 1}: dòng không hợp lệ sau đáp án — "${line.slice(0, 40)}"`
        );
      }
    }

    if (questionLines.length === 0) {
      errors.push(`Câu ${index + 1}: thiếu nội dung câu hỏi`);
      return;
    }

    if (options.length < 2) {
      errors.push(`Câu ${index + 1}: cần ít nhất 2 lựa chọn (A., B., ...)`);
      return;
    }

    if (answerLabels.length === 0) {
      errors.push(
        `Câu ${index + 1}: thiếu dòng ANSWER: hoặc định dạng không hợp lệ (vd. ANSWER: A hoặc ANSWER: A,D)`
      );
      return;
    }

    const labels = new Set(options.map((o) => o.label));
    const invalidAnswers = answerLabels.filter((l) => !labels.has(l));
    if (invalidAnswers.length > 0) {
      errors.push(
        `Câu ${index + 1}: ANSWER ${invalidAnswers.join(",")} không khớp lựa chọn (${Array.from(labels).join(", ")})`
      );
      return;
    }

    const uniqueAnswers = Array.from(new Set(answerLabels));
    if (uniqueAnswers.length !== answerLabels.length) {
      errors.push(`Câu ${index + 1}: ANSWER trùng lặp`);
      return;
    }

    questions.push({
      content: questionLines.join("\n"),
      options,
      answerLabels: uniqueAnswers,
    });
  });

  return { questions, errors };
}

export function aikenToQuestionPayload(q: ParsedAikenQuestion) {
  const correctSet = new Set(q.answerLabels);
  const correctCount = q.answerLabels.length;
  const perCorrect = correctCount > 0 ? 100 / correctCount : 0;

  return {
    content: q.content,
    name: q.content.split("\n")[0].slice(0, 100),
    points: 1,
    shuffleAnswers: false,
    options: q.options.map((o) => {
      const isCorrect = correctSet.has(o.label);
      return {
        text: o.text,
        isCorrect,
        gradePercent: isCorrect ? perCorrect : 0,
      };
    }),
  };
}
