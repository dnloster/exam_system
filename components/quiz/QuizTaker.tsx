"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { cn } from "@/components/ui/cn";
import QuestionAnswerInput, {
  type QuestionAnswerValue,
} from "./QuestionAnswerInput";
import { isQuestionAnswered } from "@/lib/quiz-attempt-ui";

type Question = {
  questionId: number;
  order: number;
  question: {
    id: number;
    type: string;
    content: string;
    shuffleAnswers?: boolean;
    multipleResponse?: boolean;
    configJson?: unknown;
    options: {
      id: number;
      text: string;
      mediaType?: string | null;
      imageUrl?: string | null;
      optionRole?: string;
      sortOrder?: number;
      groupKey?: string | null;
    }[];
  };
};

type QuizTakerProps = {
  quizId: number;
  attemptId: number;
  title: string;
  timeLimitMinutes: number | null;
  shuffleQuestions: boolean;
  questionsPerPage: number;
  questions: Question[];
};

function NavButton({
  index,
  active,
  answered,
  flagged,
  onClick,
}: {
  index: number;
  active: boolean;
  answered: boolean;
  flagged: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Câu ${index + 1}${flagged ? " (đã đánh dấu)" : ""}`}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition",
        active && "border-portal-primary bg-portal-primary text-white shadow-sm",
        !active && answered && "border-emerald-300 bg-emerald-50 text-emerald-800",
        !active && !answered && flagged && "border-amber-400 bg-amber-50 text-amber-900",
        !active && !answered && !flagged && "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
        !active && answered && flagged && "border-amber-400 bg-amber-50 text-amber-900 ring-1 ring-emerald-200"
      )}
    >
      {index + 1}
      {flagged && (
        <span
          className="absolute -right-1 -top-1 text-[10px]"
          aria-hidden
        >
          🚩
        </span>
      )}
    </button>
  );
}

export default function QuizTaker({
  quizId,
  attemptId,
  title,
  timeLimitMinutes,
  shuffleQuestions,
  questionsPerPage,
  questions,
}: QuizTakerProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, QuestionAnswerValue>>(
    {}
  );
  const [flaggedIds, setFlaggedIds] = useState<Set<number>>(new Set());
  const [pageIndex, setPageIndex] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const orderedQuestions = useMemo(() => {
    const sorted = [...questions].sort((a, b) => a.order - b.order);
    if (!shuffleQuestions) return sorted;
    return [...sorted].sort(() => Math.random() - 0.5);
  }, [questions, shuffleQuestions]);

  const pageSize = useMemo(() => {
    if (questionsPerPage <= 0) return orderedQuestions.length || 1;
    return questionsPerPage;
  }, [questionsPerPage, orderedQuestions.length]);

  const totalPages = Math.max(
    1,
    Math.ceil(orderedQuestions.length / pageSize)
  );
  const pageStart = pageIndex * pageSize;
  const pageQuestions = orderedQuestions.slice(
    pageStart,
    pageStart + pageSize
  );
  const isSingleQuestionPage = pageSize === 1;

  const totalSeconds = (timeLimitMinutes ?? 0) * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds || null);

  const answeredCount = useMemo(
    () =>
      orderedQuestions.filter((q) =>
        isQuestionAnswered(q.question, answers[q.question.id])
      ).length,
    [orderedQuestions, answers]
  );

  const flaggedCount = flaggedIds.size;
  const unansweredCount = orderedQuestions.length - answeredCount;

  useEffect(() => {
    if (!timeLimitMinutes) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLimitMinutes]);

  useEffect(() => {
    if (secondsLeft === 0 && !submitting && !submitted) {
      handleSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  function setAnswer(questionId: number, value: QuestionAnswerValue) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function toggleFlag(questionId: number) {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  function goToQuestion(index: number) {
    const safeIndex = Math.max(
      0,
      Math.min(index, orderedQuestions.length - 1)
    );
    setPageIndex(Math.floor(safeIndex / pageSize));
    setShowReview(false);
  }

  function goToPage(nextPage: number) {
    setPageIndex(Math.max(0, Math.min(nextPage, totalPages - 1)));
    setShowReview(false);
  }

  async function handleSubmit(auto = false) {
    if (submitted || submitting) return;
    setSubmitting(true);
    setError("");
    setShowReview(false);

    const payload = {
      answers: orderedQuestions.map((q) => {
        const a = answers[q.question.id] ?? {};
        return {
          questionId: q.question.id,
          selectedOptionId: a.selectedOptionId ?? null,
          selectedOptionIds: a.selectedOptionIds,
          answerJson: a.answerJson,
        };
      }),
    };

    const res = await fetch(`/api/attempts/${attemptId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Không thể nộp bài");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    router.push(`/quizzes/${quizId}/result/${attemptId}${auto ? "?auto=1" : ""}`);
  }

  const minutes = secondsLeft !== null ? Math.floor(secondsLeft / 60) : null;
  const seconds = secondsLeft !== null ? secondsLeft % 60 : null;

  if (orderedQuestions.length === 0) {
    return (
      <Alert variant="warning">Bài kiểm tra không có câu hỏi.</Alert>
    );
  }

  const sidebar = (
    <div className="space-y-4">
      <Card className="p-4">
        <h1 className="text-base font-semibold leading-snug text-slate-900">
          {title}
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          {orderedQuestions.length} câu hỏi
        </p>
        {secondsLeft !== null && (
          <div
            className={cn(
              "mt-3 rounded-xl px-3 py-2 text-center font-mono text-lg font-semibold",
              secondsLeft < 60
                ? "bg-red-50 text-red-700"
                : "bg-blue-50 text-portal-primary"
            )}
          >
            ⏱ {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Danh sách câu hỏi
        </p>
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-4 lg:grid-cols-5">
          {orderedQuestions.map((q, index) => (
            <NavButton
              key={q.question.id}
              index={index}
              active={
                index >= pageStart && index < pageStart + pageSize
              }
              answered={isQuestionAnswered(
                q.question,
                answers[q.question.id]
              )}
              flagged={flaggedIds.has(q.question.id)}
              onClick={() => goToQuestion(index)}
            />
          ))}
        </div>
        <ul className="mt-3 space-y-1 text-xs text-slate-500">
          <li>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />{" "}
            Đã trả lời ({answeredCount})
          </li>
          <li>
            <span className="inline-block h-2 w-2 rounded-full bg-slate-300" />{" "}
            Chưa trả lời ({unansweredCount})
          </li>
          <li>🚩 Đánh dấu ({flaggedCount})</li>
        </ul>
      </Card>

      <Button
        className="w-full"
        size="lg"
        onClick={() => setShowReview(true)}
        disabled={submitting}
      >
        Xem lại và nộp bài
      </Button>
    </div>
  );

  return (
    <>
      <Modal
        open={showReview}
        onClose={() => !submitting && setShowReview(false)}
        title="Xem lại trước khi nộp"
        description="Kiểm tra các câu đã trả lời, câu đánh dấu và câu còn trống."
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg bg-emerald-50 px-2 py-2 text-emerald-800">
              <strong>{answeredCount}</strong>
              <p className="text-xs">Đã trả lời</p>
            </div>
            <div className="rounded-lg bg-slate-100 px-2 py-2 text-slate-700">
              <strong>{unansweredCount}</strong>
              <p className="text-xs">Chưa trả lời</p>
            </div>
            <div className="rounded-lg bg-amber-50 px-2 py-2 text-amber-900">
              <strong>{flaggedCount}</strong>
              <p className="text-xs">Đánh dấu</p>
            </div>
          </div>

          {unansweredCount > 0 && (
            <Alert variant="warning">
              Còn {unansweredCount} câu chưa trả lời. Bạn vẫn có thể nộp bài.
            </Alert>
          )}

          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 w-12">#</th>
                  <th className="px-3 py-2">Trạng thái</th>
                  <th className="px-3 py-2">Nội dung</th>
                </tr>
              </thead>
              <tbody>
                {orderedQuestions.map((q, index) => {
                  const answered = isQuestionAnswered(
                    q.question,
                    answers[q.question.id]
                  );
                  const flagged = flaggedIds.has(q.question.id);
                  return (
                    <tr
                      key={q.question.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-3 py-2 font-medium">{index + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {answered ? (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800">
                              Đã trả lời
                            </span>
                          ) : (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                              Trống
                            </span>
                          )}
                          {flagged && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">
                              🚩
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="line-clamp-2 text-left text-portal-primary hover:underline"
                          onClick={() => goToQuestion(index)}
                        >
                          {q.question.content.slice(0, 80)}
                          {q.question.content.length > 80 ? "…" : ""}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {error && <Alert variant="error">{error}</Alert>}

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowReview(false)}
              disabled={submitting}
            >
              Quay lại làm bài
            </Button>
            <Button onClick={() => handleSubmit(false)} disabled={submitting}>
              {submitting ? "Đang nộp..." : "Nộp bài"}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-4">{sidebar}</aside>

        <div className="min-w-0 space-y-4">
          {totalPages > 1 && (
            <p className="text-sm font-medium text-slate-600">
              {isSingleQuestionPage
                ? `Câu ${pageStart + 1} / ${orderedQuestions.length}`
                : `Trang ${pageIndex + 1} / ${totalPages} (câu ${pageStart + 1}–${Math.min(pageStart + pageSize, orderedQuestions.length)})`}
            </p>
          )}

          {pageQuestions.map((current, idxOnPage) => {
            const globalIndex = pageStart + idxOnPage;
            const isFlagged = flaggedIds.has(current.question.id);

            return (
              <Card key={current.question.id} className="p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Câu {globalIndex + 1} / {orderedQuestions.length}
                    </p>
                    {current.question.type !== "FILL_IN_BLANK" ? (
                      <p className="mt-1 font-medium text-slate-900">
                        {current.question.content}
                      </p>
                    ) : (
                      <p className="mt-1 font-medium text-slate-900">
                        Điền vào chỗ trống
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFlag(current.question.id)}
                    className={cn(
                      "shrink-0 rounded-lg border px-3 py-1.5 text-sm transition",
                      isFlagged
                        ? "border-amber-400 bg-amber-50 text-amber-900"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {isFlagged ? "🚩 Bỏ đánh dấu" : "🚩 Đánh dấu câu"}
                  </button>
                </div>

                <QuestionAnswerInput
                  question={current.question}
                  value={answers[current.question.id] ?? {}}
                  onChange={(value) =>
                    setAnswer(current.question.id, value)
                  }
                />
              </Card>
            );
          })}

          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="secondary"
                disabled={pageIndex === 0}
                onClick={() => goToPage(pageIndex - 1)}
              >
                {isSingleQuestionPage ? "← Câu trước" : "← Trang trước"}
              </Button>
              {pageIndex < totalPages - 1 ? (
                <Button onClick={() => goToPage(pageIndex + 1)}>
                  {isSingleQuestionPage ? "Câu sau →" : "Trang sau →"}
                </Button>
              ) : (
                <Button onClick={() => setShowReview(true)}>
                  Xem lại và nộp
                </Button>
              )}
            </div>
          </Card>

          {error && !showReview && <Alert variant="error">{error}</Alert>}
        </div>
      </div>
    </>
  );
}
