"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import PortalLayout from "@/components/portal/PortalLayout";
import QuizTaker from "@/components/quiz/QuizTaker";

type QuizData = {
  id: number;
  title: string;
  timeLimitMinutes: number | null;
  shuffleQuestions: boolean;
  questions: {
    questionId: number;
    order: number;
    question: {
      id: number;
      content: string;
      options: { id: number; text: string }[];
    };
  }[];
};

export default function QuizAttemptPage() {
  const params = useParams();
  const quizId = Number(params.id);
  const attemptId = Number(params.attemptId);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/quizzes/${quizId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Không thể tải bài kiểm tra");
        return res.json();
      })
      .then(setQuiz)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [quizId]);

  if (loading) {
    return (
      <PortalLayout>
        <div className="p-8 text-center">Đang tải...</div>
      </PortalLayout>
    );
  }

  if (!quiz || error) {
    return (
      <PortalLayout>
        <div className="p-8 text-center text-red-600">{error || "Không tìm thấy"}</div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <QuizTaker
          quizId={quizId}
          attemptId={attemptId}
          title={quiz.title}
          timeLimitMinutes={quiz.timeLimitMinutes}
          shuffleQuestions={quiz.shuffleQuestions}
          questions={quiz.questions}
        />
      </div>
    </PortalLayout>
  );
}
