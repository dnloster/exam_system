"use client";

import { isMultipleResponseQuestion } from "@/lib/quiz-grading";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";

export type PreviewQuestion = {
  name?: string | null;
  content: string;
  points?: number;
  shuffleAnswers?: boolean;
  generalFeedback?: string | null;
  options: {
    id?: number;
    text: string;
    isCorrect?: boolean;
    gradePercent?: number;
  }[];
};

function optionGrade(
  opt: PreviewQuestion["options"][number]
): number {
  if (opt.gradePercent != null && opt.gradePercent > 0) return opt.gradePercent;
  return opt.isCorrect ? 100 : 0;
}

type QuestionPreviewProps = {
  question: PreviewQuestion;
  index?: number;
  showCorrectAnswers?: boolean;
};

export default function QuestionPreview({
  question,
  index,
  showCorrectAnswers = true,
}: QuestionPreviewProps) {
  const optionsWithIds = question.options.map((o, i) => ({
    ...o,
    id: o.id ?? i,
    grade: optionGrade(o),
  }));
  const isMulti = isMultipleResponseQuestion(
    optionsWithIds.map((o) => ({
      id: o.id,
      gradePercent: o.grade,
      isCorrect: o.grade > 0,
    }))
  );

  return (
    <Card>
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
          <p className="font-medium text-slate-900">{question.content}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {question.points != null && (
            <Badge variant="muted">{question.points} điểm</Badge>
          )}
          {isMulti && <Badge variant="primary">Nhiều đáp án đúng</Badge>}
          {question.shuffleAnswers && (
            <Badge variant="warning">Xáo trộn đáp án</Badge>
          )}
        </div>
      </div>

      {isMulti && (
        <p className="mb-3 text-sm text-slate-500">Chọn tất cả đáp án đúng</p>
      )}

      <div className="space-y-2">
        {optionsWithIds.map((opt, optIndex) => {
          const isCorrect = opt.grade > 0;
          const label = String.fromCharCode(65 + optIndex);
          const gradeLabel =
            opt.grade % 1 === 0 ? `${opt.grade}%` : `${opt.grade.toFixed(1)}%`;

          return (
            <div
              key={opt.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                showCorrectAnswers && isCorrect
                  ? "border-emerald-300 bg-emerald-50/60"
                  : "border-slate-200 bg-white"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
                  showCorrectAnswers && isCorrect
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                )}
              >
                {label}
              </span>
              <span className="min-w-0 flex-1 text-slate-800">{opt.text}</span>
              {showCorrectAnswers && isCorrect && (
                <Badge variant="success">
                  Đúng{isMulti ? ` · ${gradeLabel}` : ""}
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {showCorrectAnswers && question.generalFeedback && (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
          <span className="font-medium text-slate-700">Phản hồi chung: </span>
          {question.generalFeedback}
        </div>
      )}
    </Card>
  );
}
