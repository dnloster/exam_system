"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

type Quiz = {
  id: number;
  title: string;
  description: string | null;
  timeLimitMinutes: number | null;
  questions: { id: number }[];
  attempts: { id: number; status: string; score: number | null }[];
};

export default function StudentQuizPanel() {
  const { data: session, status } = useSession();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || session?.user.role !== "STUDENT") {
      return;
    }

    setLoading(true);
    fetch("/api/quizzes")
      .then(async (res) => (res.ok ? res.json() : []))
      .then(setQuizzes)
      .finally(() => setLoading(false));
  }, [session, status]);

  if (status !== "authenticated" || session?.user.role !== "STUDENT") {
    return null;
  }

  return (
    <section className="border-b border-slate-200/80 bg-white/60 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Bài kiểm tra của bạn
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Các bài bạn được ghi danh
            </p>
          </div>
          <Link href="/quizzes" className="link-primary text-sm">
            Xem tất cả →
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Đang tải bài kiểm tra...</p>
        ) : quizzes.length === 0 ? (
          <Card className="border-dashed bg-slate-50/50">
            <p className="text-sm text-slate-600">
              Chưa có bài kiểm tra. Khi giáo viên ghi danh bạn, bài sẽ hiển thị
              tại đây.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {quizzes.map((quiz) => {
              const attempt = quiz.attempts[0];
              const submitted = attempt?.status === "SUBMITTED";

              return (
                <Card key={quiz.id} className="hover:shadow-elevated">
                  <h3 className="font-semibold text-slate-900">{quiz.title}</h3>
                  {quiz.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {quiz.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{quiz.questions.length} câu hỏi</Badge>
                    {quiz.timeLimitMinutes && (
                      <Badge>{quiz.timeLimitMinutes} phút</Badge>
                    )}
                  </div>
                  <div className="mt-4">
                    {submitted ? (
                      <Link href={`/quizzes/${quiz.id}/result/${attempt.id}`}>
                        <Button variant="secondary" size="sm">
                          Xem kết quả ({attempt.score?.toFixed(1)}%)
                        </Button>
                      </Link>
                    ) : attempt?.status === "IN_PROGRESS" ? (
                      <Link href={`/quizzes/${quiz.id}/attempt/${attempt.id}`}>
                        <Button size="sm">Tiếp tục làm bài</Button>
                      </Link>
                    ) : (
                      <Link href={`/quizzes/${quiz.id}`}>
                        <Button size="sm">Bắt đầu làm bài</Button>
                      </Link>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
