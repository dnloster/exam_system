"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import PortalLayout from "@/components/portal/PortalLayout";
import ResultSummary from "@/components/quiz/ResultSummary";

type Attempt = {
  score: number | null;
  quiz: { id: number; title: string; passingScore: number };
  answers: {
    id: number;
    isCorrect: boolean | null;
    question: { id: number; content: string };
    selectedOption: { id: number; text: string } | null;
    selectedTexts?: string[];
  }[];
};

export default function QuizResultPage() {
  const params = useParams();
  const attemptId = Number(params.attemptId);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/attempts/${attemptId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Không thể tải kết quả");
        return res.json();
      })
      .then(setAttempt)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <PortalLayout>
        <div className="p-8 text-center">Đang tải...</div>
      </PortalLayout>
    );
  }

  if (!attempt || attempt.score === null) {
    return (
      <PortalLayout>
        <div className="p-8 text-center text-red-600">{error || "Không tìm thấy kết quả"}</div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <ResultSummary
          title={attempt.quiz.title}
          score={attempt.score}
          passingScore={attempt.quiz.passingScore}
          answers={attempt.answers}
        />
      </div>
    </PortalLayout>
  );
}
