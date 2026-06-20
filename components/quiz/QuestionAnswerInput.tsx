"use client";

import { useMemo, useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import type { MatrixConfig } from "@/lib/question-types";
import type { StudentAnswerJson } from "@/lib/question-types";
import ChoiceOptionContent from "./ChoiceOptionContent";
import { cn } from "@/components/ui/cn";

type QuestionOption = {
  id: number;
  text: string;
  mediaType?: string | null;
  imageUrl?: string | null;
  optionRole?: string;
  sortOrder?: number;
  groupKey?: string | null;
};

type TakerQuestion = {
  id: number;
  type: string;
  content: string;
  shuffleAnswers?: boolean;
  multipleResponse?: boolean;
  configJson?: unknown;
  options: QuestionOption[];
};

export type QuestionAnswerValue = {
  selectedOptionId?: number | null;
  selectedOptionIds?: number[];
  answerJson?: StudentAnswerJson;
};

type QuestionAnswerInputProps = {
  question: TakerQuestion;
  value: QuestionAnswerValue;
  onChange: (value: QuestionAnswerValue) => void;
  preview?: boolean;
};

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function QuestionAnswerInput({
  question,
  value,
  onChange,
  preview = false,
}: QuestionAnswerInputProps) {
  const type = question.type;

  if (type === "MULTIPLE_CHOICE" || type === "MULTIPLE_RESPONSE") {
    return (
      <ChoiceInput
        question={question}
        value={value}
        onChange={onChange}
        preview={preview}
      />
    );
  }
  if (type === "MATCHING") {
    return (
      <MatchingInput question={question} value={value} onChange={onChange} />
    );
  }
  if (type === "FILL_IN_BLANK") {
    return (
      <FillBlankInput question={question} value={value} onChange={onChange} />
    );
  }
  if (type === "ORDERING") {
    return (
      <OrderingInput question={question} value={value} onChange={onChange} />
    );
  }
  if (type === "DRAG_AND_DROP") {
    return (
      <DragDropInput question={question} value={value} onChange={onChange} />
    );
  }
  if (type === "MATRIX") {
    return (
      <MatrixInput question={question} value={value} onChange={onChange} />
    );
  }

  return (
    <ChoiceInput
      question={question}
      value={value}
      onChange={onChange}
      preview={preview}
    />
  );
}

function ChoiceInput({
  question,
  value,
  onChange,
  preview,
}: QuestionAnswerInputProps) {
  const isMulti =
    question.type === "MULTIPLE_RESPONSE" || question.multipleResponse;
  const options = useMemo(() => {
    const opts = question.options;
    if (!question.shuffleAnswers || preview) return opts;
    return shuffle(opts);
  }, [question.options, question.shuffleAnswers, preview]);

  return (
    <div className="space-y-2">
      {isMulti && (
        <p className="text-sm text-slate-500">Chọn tất cả đáp án đúng</p>
      )}
      {options.map((opt) => {
        const selected = isMulti
          ? (value.selectedOptionIds ?? []).includes(opt.id)
          : value.selectedOptionId === opt.id;
        return (
          <label
            key={opt.id}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition hover:bg-slate-50",
              selected
                ? "border-portal-primary bg-blue-50/50"
                : "border-slate-200"
            )}
          >
            <input
              type={isMulti ? "checkbox" : "radio"}
              name={`q-${question.id}`}
              checked={selected}
              disabled={preview}
              className="mt-1 shrink-0"
              onChange={() => {
                if (isMulti) {
                  const current = value.selectedOptionIds ?? [];
                  const next = current.includes(opt.id)
                    ? current.filter((id) => id !== opt.id)
                    : [...current, opt.id];
                  onChange({ selectedOptionIds: next });
                } else {
                  onChange({ selectedOptionId: opt.id });
                }
              }}
            />
            <ChoiceOptionContent
              text={opt.text}
              mediaType={opt.mediaType}
              imageUrl={opt.imageUrl}
            />
          </label>
        );
      })}
    </div>
  );
}

function MatchingInput({
  question,
  value,
  onChange,
}: QuestionAnswerInputProps) {
  const prompts = question.options
    .filter((o) => o.optionRole === "MATCH_PROMPT")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const answers = useMemo(() => {
    const list = question.options
      .filter((o) => o.optionRole === "MATCH_ANSWER")
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return question.shuffleAnswers ? shuffle(list) : list;
  }, [question.options, question.shuffleAnswers]);

  const matches = value.answerJson?.matches ?? {};

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Ghép mỗi mục với đáp án phù hợp</p>
      {prompts.map((prompt) => (
        <div
          key={prompt.id}
          className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_200px]"
        >
          <span className="text-sm font-medium text-slate-800">
            {prompt.text}
          </span>
          <Select
            value={matches[String(prompt.id)] ?? ""}
            onChange={(e) =>
              onChange({
                answerJson: {
                  matches: {
                    ...matches,
                    [String(prompt.id)]: Number(e.target.value),
                  },
                },
              })
            }
          >
            <option value="">— Chọn —</option>
            {answers.map((ans) => (
              <option key={ans.id} value={ans.id}>
                {ans.text}
              </option>
            ))}
          </Select>
        </div>
      ))}
    </div>
  );
}

function FillBlankInput({
  question,
  value,
  onChange,
}: QuestionAnswerInputProps) {
  const blanks = value.answerJson?.blanks ?? {};
  const parts = question.content.split(/(\{\{\w+\}\})/);

  return (
    <div className="text-sm leading-8 text-slate-800">
      {parts.map((part, i) => {
        const match = part.match(/^\{\{(\w+)\}\}$/);
        if (!match) {
          return (
            <span key={i} className="whitespace-pre-wrap">
              {part}
            </span>
          );
        }
        const blankId = match[1];
        return (
          <Input
            key={i}
            className="mx-1 inline-block w-40 align-middle"
            value={blanks[blankId] ?? ""}
            placeholder="..."
            onChange={(e) =>
              onChange({
                answerJson: {
                  blanks: { ...blanks, [blankId]: e.target.value },
                },
              })
            }
          />
        );
      })}
    </div>
  );
}

function OrderingInput({
  question,
  value,
  onChange,
}: QuestionAnswerInputProps) {
  const items = question.options
    .filter((o) => o.optionRole === "ORDER_ITEM")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const order = value.answerJson?.order ?? items.map((o) => o.id);

  const orderedItems = order
    .map((id) => items.find((o) => o.id === id))
    .filter(Boolean) as QuestionOption[];

  function move(index: number, dir: -1 | 1) {
    const next = [...order];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ answerJson: { order: next } });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500">Sắp xếp các mục theo thứ tự đúng</p>
      {orderedItems.map((item, index) => (
        <div
          key={item.id}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"
        >
          <span className="w-6 text-center text-slate-400">{index + 1}</span>
          <span className="flex-1 text-sm">{item.text}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={index === 0}
            onClick={() => move(index, -1)}
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={index === orderedItems.length - 1}
            onClick={() => move(index, 1)}
          >
            ↓
          </Button>
        </div>
      ))}
    </div>
  );
}

function DragDropInput({
  question,
  value,
  onChange,
}: QuestionAnswerInputProps) {
  const items = question.options.filter((o) => o.optionRole === "DRAG_ITEM");
  const zones = question.options
    .filter((o) => o.optionRole === "DROP_ZONE")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const drops = value.answerJson?.drops ?? {};
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const usedIds = new Set(Object.values(drops));
  const available = items.filter((i) => !usedIds.has(i.id));

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Kéo các mục vào vùng thả phù hợp (hoặc chọn từ danh sách)
      </p>
      <div className="flex flex-wrap gap-2">
        {available.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => setDraggingId(item.id)}
            className="cursor-grab rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
          >
            {item.text}
          </div>
        ))}
      </div>
      {zones.map((zone) => {
        const droppedId = drops[String(zone.id)];
        const dropped = items.find((i) => i.id === droppedId);
        return (
          <div
            key={zone.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggingId == null) return;
              onChange({
                answerJson: {
                  drops: { ...drops, [String(zone.id)]: draggingId },
                },
              });
              setDraggingId(null);
            }}
            className="rounded-xl border-2 border-dashed border-slate-300 p-3"
          >
            <p className="mb-2 text-sm font-medium text-slate-700">
              {zone.text}
            </p>
            {dropped ? (
              <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-sm">
                <span>{dropped.text}</span>
                <button
                  type="button"
                  className="text-red-600"
                  onClick={() => {
                    const next = { ...drops };
                    delete next[String(zone.id)];
                    onChange({ answerJson: { drops: next } });
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <Select
                value=""
                onChange={(e) => {
                  const id = Number(e.target.value);
                  if (!id) return;
                  onChange({
                    answerJson: {
                      drops: { ...drops, [String(zone.id)]: id },
                    },
                  });
                }}
              >
                <option value="">Chọn mục thả vào đây</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.text}
                  </option>
                ))}
              </Select>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MatrixInput({
  question,
  value,
  onChange,
}: QuestionAnswerInputProps) {
  const config = (question.configJson ?? { columns: [] }) as MatrixConfig;
  const rows = question.options
    .filter((o) => o.optionRole === "MATRIX_ROW")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const matrix = value.answerJson?.matrix ?? {};

  return (
    <div className="overflow-x-auto">
      <table className="data-table w-full min-w-[400px]">
        <thead>
          <tr>
            <th />
            {config.columns.map((col) => (
              <th key={col.id} className="text-center">
                {col.text}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="font-medium">{row.text}</td>
              {config.columns.map((col) => (
                <td key={col.id} className="text-center">
                  <input
                    type="radio"
                    name={`matrix-${question.id}-${row.groupKey}`}
                    checked={matrix[row.groupKey ?? ""] === col.id}
                    onChange={() =>
                      onChange({
                        answerJson: {
                          matrix: {
                            ...matrix,
                            [row.groupKey ?? ""]: col.id,
                          },
                        },
                      })
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
