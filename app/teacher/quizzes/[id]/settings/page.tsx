"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import QuizSettingsForm, {
  QuizSettingsData,
} from "@/components/moodle/QuizSettingsForm";

type Quiz = QuizSettingsData & {
  id: number;
  openAt: string | null;
  closeAt: string | null;
};

export default function QuizSettingsPage() {
  const params = useParams();
  const quizId = Number(params.id);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [saved, setSaved] = useState(false);

  async function loadQuiz() {
    const res = await fetch(`/api/quizzes/${quizId}`);
    if (res.ok) setQuiz(await res.json());
  }

  useEffect(() => {
    loadQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  async function handleSave(data: QuizSettingsData) {
    const payload = {
      ...data,
      openAt: data.openAt ? new Date(data.openAt).toISOString() : null,
      closeAt: data.closeAt ? new Date(data.closeAt).toISOString() : null,
    };

    const res = await fetch(`/api/quizzes/${quizId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Không thể lưu");
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    await loadQuiz();
  }

  if (!quiz) return <p>Đang tải...</p>;

  return (
    <div>
      {saved && (
        <div className="mb-4 rounded border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800">
          Đã lưu thay đổi.
        </div>
      )}
      <QuizSettingsForm
        initial={{
          title: quiz.title,
          description: quiz.description,
          openAt: quiz.openAt ?? undefined,
          closeAt: quiz.closeAt ?? undefined,
          timeLimitMinutes: quiz.timeLimitMinutes,
          shuffleQuestions: quiz.shuffleQuestions,
          questionsPerPage: quiz.questionsPerPage,
          attemptsAllowed: quiz.attemptsAllowed,
          passingScore: quiz.passingScore,
          isPublished: quiz.isPublished,
        }}
        onSubmit={handleSave}
      />
    </div>
  );
}
