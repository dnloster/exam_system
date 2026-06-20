import type { QuestionTypeValue } from "./question-types";
import type { MatrixConfig, FillBlankConfig } from "./question-types";
import { gradesToStoredOptions, optionsToEditorGrades, type EditorOption } from "./question-options";

export type MatchPairInput = { prompt: string; answer: string };
export type DropZoneInput = { label: string; correctItemIndex: number };
export type MatrixRowInput = { text: string; correctColumnIndex: number };

export type QuestionFormData = {
  type: QuestionTypeValue;
  name?: string;
  content: string;
  category?: string;
  points: number;
  generalFeedback?: string;
  shuffleAnswers: boolean;
  options?: EditorOption[];
  matchPairs?: MatchPairInput[];
  blankAnswers?: Record<string, string[]>;
  orderItems?: string[];
  dragItems?: string[];
  dropZones?: DropZoneInput[];
  matrixColumns?: string[];
  matrixRows?: MatrixRowInput[];
  fillBlankCaseSensitive?: boolean;
};

type DbOptionInput = {
  text: string;
  mediaType?: "TEXT" | "IMAGE";
  imageUrl?: string | null;
  isCorrect: boolean;
  gradePercent: number;
  sortOrder: number;
  optionRole: string;
  groupKey?: string | null;
  matchTarget?: string | null;
};

type DbPayload = {
  type: QuestionTypeValue;
  configJson?: object | null;
  options: DbOptionInput[];
};

type DbQuestion = {
  type: string;
  content: string;
  configJson?: unknown;
  options: {
    id?: number;
    text: string;
    mediaType?: string | null;
    imageUrl?: string | null;
    isCorrect?: boolean;
    gradePercent?: number;
    sortOrder?: number;
    optionRole?: string;
    groupKey?: string | null;
    matchTarget?: string | null;
  }[];
};

export function inferChoiceType(options: EditorOption[]): QuestionTypeValue {
  const correctCount = options.filter((o) => o.gradePercent > 0).length;
  return correctCount > 1 ? "MULTIPLE_RESPONSE" : "MULTIPLE_CHOICE";
}

export function formToDbPayload(data: QuestionFormData): DbPayload {
  switch (data.type) {
    case "MULTIPLE_CHOICE":
    case "MULTIPLE_RESPONSE": {
      const options = data.options ?? [];
      const type =
        data.type === "MULTIPLE_RESPONSE"
          ? "MULTIPLE_RESPONSE"
          : inferChoiceType(options);
      return {
        type,
        options: gradesToStoredOptions(options).map((o, i) => ({
          ...o,
          sortOrder: i,
          optionRole: "CHOICE",
        })),
      };
    }

    case "MATCHING": {
      const pairs = data.matchPairs ?? [];
      const options: DbOptionInput[] = [];
      pairs.forEach((pair, i) => {
        const answerKey = `ans-${i}`;
        options.push({
          text: pair.answer,
          isCorrect: true,
          gradePercent: pairs.length > 0 ? 100 / pairs.length : 0,
          sortOrder: i,
          optionRole: "MATCH_ANSWER",
          groupKey: answerKey,
        });
      });
      pairs.forEach((pair, i) => {
        options.push({
          text: pair.prompt,
          isCorrect: true,
          gradePercent: pairs.length > 0 ? 100 / pairs.length : 0,
          sortOrder: i,
          optionRole: "MATCH_PROMPT",
          groupKey: `prm-${i}`,
          matchTarget: `ans-${i}`,
        });
      });
      return { type: "MATCHING", options };
    }

    case "FILL_IN_BLANK": {
      const blankAnswers = data.blankAnswers ?? {};
      const options: DbOptionInput[] = [];
      let sort = 0;
      for (const [blankId, answers] of Object.entries(blankAnswers)) {
        const valid = answers.map((a) => a.trim()).filter(Boolean);
        const each = valid.length > 0 ? 100 / Object.keys(blankAnswers).length : 0;
        for (const text of valid) {
          options.push({
            text,
            isCorrect: true,
            gradePercent: each / valid.length,
            sortOrder: sort++,
            optionRole: "BLANK_ANSWER",
            groupKey: blankId,
          });
        }
      }
      return {
        type: "FILL_IN_BLANK",
        configJson: {
          caseSensitive: data.fillBlankCaseSensitive ?? false,
        } satisfies FillBlankConfig,
        options,
      };
    }

    case "ORDERING": {
      const items = data.orderItems ?? [];
      return {
        type: "ORDERING",
        options: items.map((text, i) => ({
          text,
          isCorrect: true,
          gradePercent: items.length > 0 ? 100 / items.length : 0,
          sortOrder: i,
          optionRole: "ORDER_ITEM",
          groupKey: `ord-${i}`,
        })),
      };
    }

    case "DRAG_AND_DROP": {
      const items = data.dragItems ?? [];
      const zones = data.dropZones ?? [];
      const options: DbOptionInput[] = [];
      items.forEach((text, i) => {
        options.push({
          text,
          isCorrect: false,
          gradePercent: 0,
          sortOrder: i,
          optionRole: "DRAG_ITEM",
          groupKey: `item-${i}`,
        });
      });
      zones.forEach((zone, i) => {
        options.push({
          text: zone.label,
          isCorrect: true,
          gradePercent: zones.length > 0 ? 100 / zones.length : 0,
          sortOrder: i,
          optionRole: "DROP_ZONE",
          groupKey: `zone-${i}`,
          matchTarget: `item-${zone.correctItemIndex}`,
        });
      });
      return { type: "DRAG_AND_DROP", options };
    }

    case "MATRIX": {
      const columns = (data.matrixColumns ?? []).map((text, i) => ({
        id: `col-${i}`,
        text,
      }));
      const rows = data.matrixRows ?? [];
      return {
        type: "MATRIX",
        configJson: { columns } satisfies MatrixConfig,
        options: rows.map((row, i) => ({
          text: row.text,
          isCorrect: true,
          gradePercent: rows.length > 0 ? 100 / rows.length : 0,
          sortOrder: i,
          optionRole: "MATRIX_ROW",
          groupKey: `row-${i}`,
          matchTarget: `col-${row.correctColumnIndex}`,
        })),
      };
    }

    default:
      return { type: "MULTIPLE_CHOICE", options: [] };
  }
}

export function dbToFormData(question: DbQuestion): QuestionFormData {
  const base = {
    type: question.type as QuestionTypeValue,
    content: question.content,
    points: 1,
    shuffleAnswers: false,
  };

  if (question.type === "MULTIPLE_CHOICE" || question.type === "MULTIPLE_RESPONSE") {
    const choiceOptions = question.options.filter(
      (o) => o.optionRole === "CHOICE" || !o.optionRole
    );
    return {
      ...base,
      type: question.type as QuestionTypeValue,
      options: optionsToEditorGrades(choiceOptions),
    };
  }

  if (question.type === "MATCHING") {
    const answers = question.options
      .filter((o) => o.optionRole === "MATCH_ANSWER")
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const prompts = question.options
      .filter((o) => o.optionRole === "MATCH_PROMPT")
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return {
      ...base,
      matchPairs: prompts.map((p) => {
        const ans = answers.find((a) => a.groupKey === p.matchTarget);
        return { prompt: p.text, answer: ans?.text ?? "" };
      }),
    };
  }

  if (question.type === "FILL_IN_BLANK") {
    const config = (question.configJson ?? {}) as FillBlankConfig;
    const blankAnswers: Record<string, string[]> = {};
    for (const opt of question.options.filter(
      (o) => o.optionRole === "BLANK_ANSWER"
    )) {
      const key = opt.groupKey ?? "1";
      if (!blankAnswers[key]) blankAnswers[key] = [];
      blankAnswers[key].push(opt.text);
    }
    return {
      ...base,
      blankAnswers,
      fillBlankCaseSensitive: config.caseSensitive ?? false,
    };
  }

  if (question.type === "ORDERING") {
    return {
      ...base,
      orderItems: question.options
        .filter((o) => o.optionRole === "ORDER_ITEM")
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((o) => o.text),
    };
  }

  if (question.type === "DRAG_AND_DROP") {
    const items = question.options
      .filter((o) => o.optionRole === "DRAG_ITEM")
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const zones = question.options
      .filter((o) => o.optionRole === "DROP_ZONE")
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return {
      ...base,
      dragItems: items.map((o) => o.text),
      dropZones: zones.map((z) => ({
        label: z.text,
        correctItemIndex: items.findIndex(
          (i) => i.groupKey === z.matchTarget
        ),
      })),
    };
  }

  if (question.type === "MATRIX") {
    const config = (question.configJson ?? { columns: [] }) as MatrixConfig;
    const rows = question.options
      .filter((o) => o.optionRole === "MATRIX_ROW")
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return {
      ...base,
      matrixColumns: config.columns.map((c) => c.text),
      matrixRows: rows.map((r) => ({
        text: r.text,
        correctColumnIndex: config.columns.findIndex(
          (c) => c.id === r.matchTarget
        ),
      })),
    };
  }

  return base;
}

export function parseBlankIds(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g) ?? [];
  return Array.from(new Set(matches.map((m) => m.slice(2, -2))));
}
