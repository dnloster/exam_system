"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import QuizSettingsForm, {
  QuizSettingsData,
} from "@/components/moodle/QuizSettingsForm";

export default function NewQuizPage() {
  const router = useRouter();

  async function handleCreate(data: QuizSettingsData) {
    const payload = {
      ...data,
      openAt: data.openAt ? new Date(data.openAt).toISOString() : null,
      closeAt: data.closeAt ? new Date(data.closeAt).toISOString() : null,
    };

    const res = await fetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Không thể tạo bài kiểm tra");
    }

    const quiz = await res.json();
    router.push(`/teacher/quizzes/${quiz.id}/questions`);
  }

  return (
    <PortalLayout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href="/teacher/quizzes"
          className="text-sm text-portal-primary hover:underline"
        >
          ← Danh sách bài kiểm tra
        </Link>
        <h1 className="mt-4 mb-6 text-2xl font-bold text-portal-primary">
          Thêm bài kiểm tra mới
        </h1>
        <QuizSettingsForm
          initial={{
            title: "",
            description: "",
            shuffleQuestions: false,
            questionsPerPage: 0,
            attemptsAllowed: 1,
            passingScore: 50,
            isPublished: false,
          }}
          onSubmit={handleCreate}
          submitLabel="Lưu và chỉnh sửa câu hỏi"
        />
      </div>
    </PortalLayout>
  );
}
