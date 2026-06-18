"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";

type Option = { id: number; text: string };
type Question = {
  questionId: number;
  order: number;
  question: {
    id: number;
    content: string;
    shuffleAnswers?: boolean;
    multipleResponse?: boolean;
    options: Option[];
  };
};

type QuizTakerProps = {
  quizId: number;
  attemptId: number;
  title: string;
  timeLimitMinutes: number | null;
  shuffleQuestions: boolean;
  questions: Question[];
};

export default function QuizTaker({
  quizId,
  attemptId,
  title,
  timeLimitMinutes,
  shuffleQuestions,
  questions,
}: QuizTakerProps) {
  const router = useRouter();
  const [singleAnswers, setSingleAnswers] = useState<
    Record<number, number | null>
  >({});
  const [multiAnswers, setMultiAnswers] = useState<Record<number, number[]>>(
    {}
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const orderedQuestions = useMemo(() => {
    const sorted = [...questions].sort((a, b) => a.order - b.order);
    if (!shuffleQuestions) return sorted;
    return [...sorted].sort(() => Math.random() - 0.5);
  }, [questions, shuffleQuestions]);

  const totalSeconds = (timeLimitMinutes ?? 0) * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds || null);

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

  function selectSingleAnswer(questionId: number, optionId: number) {
    setSingleAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  function toggleMultiAnswer(questionId: number, optionId: number) {
    setMultiAnswers((prev) => {
      const current = prev[questionId] ?? [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: next };
    });
  }

  async function handleSubmit(auto = false) {
    if (submitted || submitting) return;
    setSubmitting(true);
    setError("");

    const payload = {
      answers: orderedQuestions.map((q) => {
        const questionId = q.question.id;
        if (q.question.multipleResponse) {
          return {
            questionId,
            selectedOptionIds: multiAnswers[questionId] ?? [],
          };
        }
        return {
          questionId,
          selectedOptionId: singleAnswers[questionId] ?? null,
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

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">
            {orderedQuestions.length} câu hỏi
          </p>
        </div>
        {secondsLeft !== null && (
          <div
            className={`rounded-xl px-4 py-2 font-mono text-lg ${
              secondsLeft < 60
                ? "bg-red-50 text-red-700"
                : "bg-blue-50 text-portal-primary"
            }`}
          >
            ⏱ {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </div>
        )}
      </Card>

      {orderedQuestions.map((q, index) => {
        const isMulti = q.question.multipleResponse;
        const options = q.question.shuffleAnswers
          ? [...q.question.options].sort(() => Math.random() - 0.5)
          : q.question.options;

        return (
          <Card key={q.question.id}>
            <p className="mb-1 font-medium text-slate-900">
              Câu {index + 1}: {q.question.content}
            </p>
            {isMulti && (
              <p className="mb-3 text-sm text-slate-500">
                Chọn tất cả đáp án đúng
              </p>
            )}
            <div className="space-y-2">
              {options.map((opt) => {
                const selected = isMulti
                  ? (multiAnswers[q.question.id] ?? []).includes(opt.id)
                  : singleAnswers[q.question.id] === opt.id;

                return (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition hover:bg-slate-50 ${
                      selected
                        ? "border-portal-primary bg-blue-50/50"
                        : "border-slate-200"
                    }`}
                  >
                    <input
                      type={isMulti ? "checkbox" : "radio"}
                      name={`q-${q.question.id}`}
                      checked={selected}
                      onChange={() =>
                        isMulti
                          ? toggleMultiAnswer(q.question.id, opt.id)
                          : selectSingleAnswer(q.question.id, opt.id)
                      }
                    />
                    <span>{opt.text}</span>
                  </label>
                );
              })}
            </div>
          </Card>
        );
      })}

      {error && <Alert variant="error">{error}</Alert>}

      <Button onClick={() => handleSubmit(false)} disabled={submitting} size="lg">
        {submitting ? "Đang nộp bài..." : "Nộp bài"}
      </Button>
    </div>
  );
}
