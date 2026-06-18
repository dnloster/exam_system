"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import PortalLayout from "@/components/portal/PortalLayout";

type Attempt = {
  id: number;
  score: number | null;
  status: string;
  submittedAt: string | null;
  user: { fullName: string; username: string };
  quiz: { title: string; passingScore: number };
  answers: {
    id: number;
    isCorrect: boolean | null;
    question: { content: string };
    selectedOption: { text: string } | null;
  }[];
};

export default function TeacherAttemptPage() {
  const params = useParams();
  const attemptId = Number(params.id);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/attempts/${attemptId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setAttempt)
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <PortalLayout>
        <div className="p-8">Đang tải...</div>
      </PortalLayout>
    );
  }

  if (!attempt) {
    return (
      <PortalLayout>
        <div className="p-8 text-red-600">Không tìm thấy bài làm</div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/teacher/quizzes" className="text-sm text-portal-primary hover:underline">
          ← Quay lại
        </Link>

        <div className="mt-4 rounded border bg-white p-6">
          <h1 className="text-xl font-bold text-portal-primary">{attempt.quiz.title}</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sinh viên: {attempt.user.fullName} ({attempt.user.username})
          </p>
          <p className="text-sm text-gray-600">
            Điểm: {attempt.score?.toFixed(1) ?? "—"}% · Điểm đạt:{" "}
            {attempt.quiz.passingScore}%
          </p>

          <div className="mt-6 space-y-4">
            {attempt.answers.map((a, i) => (
              <div key={a.id} className="rounded border p-3 text-sm">
                <p className="font-medium">
                  Câu {i + 1}: {a.question.content}
                </p>
                <p className="mt-1">
                  Trả lời: {a.selectedOption?.text ?? "Không trả lời"}
                </p>
                <p className={a.isCorrect ? "text-green-700" : "text-red-700"}>
                  {a.isCorrect ? "Đúng" : "Sai"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
