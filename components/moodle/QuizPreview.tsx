"use client";

import { useMemo } from "react";
import QuestionPreview from "@/components/quiz/QuestionPreview";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";

type QuizPreviewQuestion = {
  order: number;
  question: {
    id: number;
    name?: string | null;
    content: string;
    points: number;
    shuffleAnswers?: boolean;
    generalFeedback?: string | null;
    multipleResponse?: boolean;
    options: { id: number; text: string; isCorrect?: boolean }[];
  };
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
    orderedQuestions.reduce((sum, q) => sum + q.question.points, 0);

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
        orderedQuestions.map((q, index) => (
          <QuestionPreview
            key={q.question.id}
            index={index}
            question={q.question}
            showCorrectAnswers={showCorrectAnswers}
          />
        ))
      )}
    </div>
  );
}
