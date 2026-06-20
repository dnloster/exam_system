"use client";

import { useMemo } from "react";
import QuestionPreview from "@/components/quiz/QuestionPreview";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";

type QuizPreviewQuestion = {
  order: number;
  slotType?: "FIXED" | "RANDOM";
  randomCategory?: { id: number; name: string } | null;
  includeSubcategories?: boolean;
  poolSize?: number;
  estimatedMaxPoints?: number;
  question: {
    id: number;
    type?: string;
    name?: string | null;
    content: string;
    points: number;
    shuffleAnswers?: boolean;
    generalFeedback?: string | null;
    multipleResponse?: boolean;
    configJson?: unknown;
    options: {
      id: number;
      text: string;
      isCorrect?: boolean;
      gradePercent?: number;
      optionRole?: string;
      sortOrder?: number;
      groupKey?: string | null;
      matchTarget?: string | null;
    }[];
  } | null;
};

type QuizPreviewProps = {
  title: string;
  description?: string | null;
  timeLimitMinutes?: number | null;
  shuffleQuestions?: boolean;
  maxGrade?: number;
  questions: QuizPreviewQuestion[];
  showCorrectAnswers?: boolean;
};

export default function QuizPreview({
  title,
  description,
  timeLimitMinutes,
  shuffleQuestions,
  maxGrade,
  questions,
  showCorrectAnswers = true,
}: QuizPreviewProps) {
  const orderedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.order - b.order),
    [questions]
  );

  const computedMaxGrade =
    maxGrade ??
    orderedQuestions.reduce((sum, q) => {
      if (q.slotType === "RANDOM") {
        return sum + (q.estimatedMaxPoints ?? 0);
      }
      return sum + (q.question?.points ?? 0);
    }, 0);

  return (
    <div className="space-y-6">
      <Alert variant="warning">
        Chế độ xem trước — học sinh sẽ không thấy đáp án đúng khi làm bài.
      </Alert>

      <Card className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          )}
          <p className="mt-2 text-sm text-slate-500">
            {orderedQuestions.length} câu hỏi · Tổng {computedMaxGrade} điểm
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {timeLimitMinutes != null && timeLimitMinutes > 0 && (
            <Badge variant="primary">Thời gian: {timeLimitMinutes} phút</Badge>
          )}
          {shuffleQuestions && (
            <Badge variant="warning">Xáo trộn câu hỏi</Badge>
          )}
        </div>
      </Card>

      {orderedQuestions.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-slate-500">
            Chưa có câu hỏi trong đề thi.
          </p>
        </Card>
      ) : (
        orderedQuestions.map((q, index) =>
          q.slotType === "RANDOM" || !q.question ? (
            <Card key={`random-${q.order}-${index}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>
                  🎲
                </span>
                <div>
                  <p className="font-medium text-slate-900">
                    Câu {index + 1}: Câu hỏi ngẫu nhiên
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Rút từ danh mục{" "}
                    <strong>{q.randomCategory?.name ?? "—"}</strong>
                    {q.includeSubcategories && " (kèm danh mục con)"}
                    {q.poolSize != null && <> · {q.poolSize} câu khả dụng</>}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Điểm tối đa ước tính: {q.estimatedMaxPoints ?? "?"} — nội
                    dung câu hỏi sẽ được rút khi học sinh làm bài.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <QuestionPreview
              key={q.question.id}
              index={index}
              question={{
                ...q.question,
                type: q.question.type ?? "MULTIPLE_CHOICE",
              }}
              showCorrectAnswers={showCorrectAnswers}
            />
          )
        )
      )}
    </div>
  );
}
