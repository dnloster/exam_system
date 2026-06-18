"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import QuizQuestionsManager from "@/components/moodle/QuizQuestionsManager";

type Quiz = {
  id: number;
  title: string;
  maxGrade: number;
  questions: {
    id: number;
    questionId: number;
    order: number;
    question: {
      id: number;
      name: string | null;
      content: string;
      points: number;
      type: string;
    };
  }[];
};

export default function QuizQuestionsPage() {
  const params = useParams();
  const quizId = Number(params.id);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  async function loadQuiz() {
    const res = await fetch(`/api/quizzes/${quizId}`);
    if (res.ok) setQuiz(await res.json());
  }

  async function loadCategories() {
    const res = await fetch(`/api/quizzes/${quizId}/categories`);
    if (res.ok) {
      const cats: { name: string }[] = await res.json();
      setCategories(cats.map((c) => c.name));
    }
  }

  useEffect(() => {
    loadQuiz();
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  if (!quiz) return <p>Đang tải...</p>;

  const maxGrade =
    quiz.maxGrade ??
    quiz.questions.reduce((s, q) => s + q.question.points, 0);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-800">
        Chỉnh sửa bài kiểm tra
      </h2>
      <QuizQuestionsManager
        quizId={quizId}
        questions={quiz.questions}
        maxGrade={maxGrade}
        categories={categories}
        onRefresh={loadQuiz}
      />
    </div>
  );
}
