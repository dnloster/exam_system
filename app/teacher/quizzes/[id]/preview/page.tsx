"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import QuizPreview from "@/components/moodle/QuizPreview";
import Button from "@/components/ui/Button";

type QuizData = {
  id: number;
  title: string;
  description: string | null;
  timeLimitMinutes: number | null;
  shuffleQuestions: boolean;
  maxGrade: number;
  questions: {
    order: number;
    question: {
      id: number;
      name: string | null;
      content: string;
      points: number;
      shuffleAnswers: boolean;
      generalFeedback: string | null;
      multipleResponse?: boolean;
      options: { id: number; text: string; isCorrect: boolean }[];
    };
  }[];
};

export default function QuizPreviewPage() {
  const params = useParams();
  const quizId = Number(params.id);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/quizzes/${quizId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setQuiz)
      .finally(() => setLoading(false));
  }, [quizId]);

  if (loading) {
    return <p className="text-sm text-slate-500">Đang tải xem trước...</p>;
  }

  if (!quiz) {
    return <p className="text-sm text-red-600">Không tìm thấy bài kiểm tra.</p>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Xem trước đề thi</h2>
        <Link href={`/teacher/quizzes/${quizId}/questions`}>
          <Button type="button" variant="secondary" size="sm">
            ← Quay lại chỉnh sửa
          </Button>
        </Link>
      </div>

      <QuizPreview
        title={quiz.title}
        description={quiz.description}
        timeLimitMinutes={quiz.timeLimitMinutes}
        shuffleQuestions={quiz.shuffleQuestions}
        maxGrade={quiz.maxGrade}
        questions={quiz.questions}
        showCorrectAnswers
      />
    </div>
  );
}
