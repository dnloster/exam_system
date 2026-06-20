"use client";

import Badge from "@/components/ui/Badge";
import { getQuestionTypeLabel } from "@/lib/question-types";
import type { MatrixConfig } from "@/lib/question-types";
import QuestionAnswerInput from "./QuestionAnswerInput";
import ChoiceOptionContent from "./ChoiceOptionContent";
import { cn } from "@/components/ui/cn";
import { choiceOptionLabel } from "@/lib/choice-media";

export type PreviewQuestionData = {
  id?: number;
  type?: string;
  name?: string | null;
  content: string;
  points?: number;
  shuffleAnswers?: boolean;
  multipleResponse?: boolean;
  generalFeedback?: string | null;
  configJson?: unknown;
  options: {
    id?: number;
    text: string;
    mediaType?: string | null;
    imageUrl?: string | null;
    isCorrect?: boolean;
    gradePercent?: number;
    optionRole?: string;
    sortOrder?: number;
    groupKey?: string | null;
    matchTarget?: string | null;
  }[];
};

type QuestionPreviewBodyProps = {
  question: PreviewQuestionData;
  index?: number;
  showCorrectAnswers?: boolean;
};

function optionGrade(opt: PreviewQuestionData["options"][number]) {
  if (opt.gradePercent != null && opt.gradePercent > 0) return opt.gradePercent;
  return opt.isCorrect ? 100 : 0;
}

export default function QuestionPreviewBody({
  question,
  index,
  showCorrectAnswers = true,
}: QuestionPreviewBodyProps) {
  const type = question.type ?? "MULTIPLE_CHOICE";
  const qId = question.id ?? 0;
  const options = question.options.map((o, i) => ({
    ...o,
    id: o.id ?? i,
  }));

  const takerQuestion = {
    id: qId,
    type,
    content: question.content,
    shuffleAnswers: false,
    multipleResponse:
      type === "MULTIPLE_RESPONSE" ||
      (type === "MULTIPLE_CHOICE" &&
        options.filter((o) => optionGrade(o) > 0).length > 1),
    configJson: question.configJson,
    options: options.map((o) => ({
      id: o.id!,
      text: o.text,
      mediaType: o.mediaType,
      imageUrl: o.imageUrl,
      optionRole: o.optionRole,
      sortOrder: o.sortOrder,
      groupKey: o.groupKey,
    })),
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {index != null && (
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Câu {index + 1}
            </p>
          )}
          {question.name && (
            <p className="mb-1 text-sm font-medium text-slate-600">
              {question.name}
            </p>
          )}
          {type === "FILL_IN_BLANK" ? (
            <p className="font-medium text-slate-900 whitespace-pre-wrap">
              {question.content}
            </p>
          ) : (
            <p className="font-medium text-slate-900">{question.content}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="primary">{getQuestionTypeLabel(type)}</Badge>
          {question.points != null && (
            <Badge variant="muted">{question.points} điểm</Badge>
          )}
        </div>
      </div>

      <QuestionAnswerInput
        question={takerQuestion}
        value={{}}
        onChange={() => {}}
        preview
      />

      {showCorrectAnswers && type === "MATCHING" && (
        <div className="mt-4 space-y-1 rounded-xl bg-emerald-50/60 p-3 text-sm">
          <p className="font-medium text-emerald-800">Đáp án đúng:</p>
          {options
            .filter((o) => o.optionRole === "MATCH_PROMPT")
            .map((p) => {
              const ans = options.find(
                (a) =>
                  a.optionRole === "MATCH_ANSWER" &&
                  a.groupKey === p.matchTarget
              );
              return (
                <p key={p.id}>
                  {p.text} → <strong>{ans?.text}</strong>
                </p>
              );
            })}
        </div>
      )}

      {showCorrectAnswers && type === "ORDERING" && (
        <div className="mt-4 rounded-xl bg-emerald-50/60 p-3 text-sm text-emerald-800">
          <p className="font-medium">Thứ tự đúng:</p>
          <ol className="mt-1 list-inside list-decimal">
            {options
              .filter((o) => o.optionRole === "ORDER_ITEM")
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
              .map((o) => (
                <li key={o.id}>{o.text}</li>
              ))}
          </ol>
        </div>
      )}

      {showCorrectAnswers && type === "FILL_IN_BLANK" && (
        <div className="mt-4 rounded-xl bg-emerald-50/60 p-3 text-sm text-emerald-800">
          <p className="font-medium">Đáp án chấp nhận:</p>
          {Object.entries(
            options
              .filter((o) => o.optionRole === "BLANK_ANSWER")
              .reduce<Record<string, string[]>>((acc, o) => {
                const k = o.groupKey ?? "1";
                if (!acc[k]) acc[k] = [];
                acc[k].push(o.text);
                return acc;
              }, {})
          ).map(([blankId, answers]) => (
            <p key={blankId}>
              {`{{${blankId}}}`}: {answers.join(", ")}
            </p>
          ))}
        </div>
      )}

      {showCorrectAnswers &&
        (type === "MULTIPLE_CHOICE" || type === "MULTIPLE_RESPONSE") && (
          <div className="mt-4 flex flex-wrap gap-2">
            {options
              .filter((o) => optionGrade(o) > 0)
              .map((o) => (
                <Badge key={o.id} variant="success">
                  <ChoiceOptionContent
                    text={choiceOptionLabel(o)}
                    mediaType={o.mediaType}
                    imageUrl={o.imageUrl}
                    imageClassName="max-h-16"
                  />
                  {type === "MULTIPLE_RESPONSE" &&
                    ` (${optionGrade(o) % 1 === 0 ? optionGrade(o) : optionGrade(o).toFixed(1)}%)`}
                </Badge>
              ))}
          </div>
        )}

      {showCorrectAnswers && type === "DRAG_AND_DROP" && (
        <div className="mt-4 space-y-1 rounded-xl bg-emerald-50/60 p-3 text-sm text-emerald-800">
          {options
            .filter((o) => o.optionRole === "DROP_ZONE")
            .map((z) => {
              const item = options.find(
                (i) =>
                  i.optionRole === "DRAG_ITEM" &&
                  i.groupKey === z.matchTarget
              );
              return (
                <p key={z.id}>
                  {z.text} ← <strong>{item?.text}</strong>
                </p>
              );
            })}
        </div>
      )}

      {showCorrectAnswers && type === "MATRIX" && (
        <div className="mt-4 rounded-xl bg-emerald-50/60 p-3 text-sm text-emerald-800">
          {(question.configJson as MatrixConfig)?.columns && (
            <div className="space-y-1">
              {options
                .filter((o) => o.optionRole === "MATRIX_ROW")
                .map((row) => {
                  const col = (
                    question.configJson as MatrixConfig
                  ).columns.find((c) => c.id === row.matchTarget);
                  return (
                    <p key={row.id}>
                      {row.text}: <strong>{col?.text}</strong>
                    </p>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {showCorrectAnswers && question.generalFeedback && (
        <div
          className={cn(
            "mt-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-600"
          )}
        >
          <span className="font-medium text-slate-700">Phản hồi chung: </span>
          {question.generalFeedback}
        </div>
      )}
    </div>
  );
}
