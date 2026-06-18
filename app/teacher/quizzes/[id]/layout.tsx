"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PortalLayout from "@/components/portal/PortalLayout";
import QuizEditTabs from "@/components/moodle/QuizEditTabs";

type Quiz = {
  id: number;
  title: string;
};

export default function QuizEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const quizId = Number(params.id);
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    fetch(`/api/quizzes/${quizId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setQuiz)
      .catch(() => router.push("/teacher/quizzes"));
  }, [quizId, router]);

  if (!quiz) {
    return (
      <PortalLayout>
        <div className="p-8 text-center">Đang tải...</div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <QuizEditTabs quizTitle={quiz.title} />
        {children}
      </div>
    </PortalLayout>
  );
}
