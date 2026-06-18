"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PortalLayout from "@/components/portal/PortalLayout";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

type Quiz = {
  id: number;
  title: string;
  description: string | null;
  timeLimitMinutes: number | null;
  passingScore: number;
  isPublished: boolean;
  questions: { id: number }[];
  attempts: { id: number; status: string; score: number | null }[];
  course: { name: string } | null;
};

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/quizzes")
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = "/login";
            return [];
          }
          throw new Error("Không thể tải danh sách");
        }
        return res.json();
      })
      .then(setQuizzes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortalLayout>
      <div className="page-shell">
        <PageHeader
          title="Bài tập, Kiểm tra"
          description="Danh sách bài kiểm tra bạn được ghi danh"
        />

        {loading && (
          <Card>
            <p className="text-slate-500">Đang tải...</p>
          </Card>
        )}
        {error && <p className="text-red-600">{error}</p>}

        <div className="grid gap-4">
          {quizzes.map((quiz) => {
            const attempt = quiz.attempts[0];
            const submitted = attempt?.status === "SUBMITTED";

            return (
              <Card key={quiz.id} className="transition hover:shadow-elevated">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {quiz.title}
                    </h2>
                    {quiz.description && (
                      <p className="mt-1 text-sm text-slate-600">
                        {quiz.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {quiz.course && (
                        <Badge variant="primary">{quiz.course.name}</Badge>
                      )}
                      <Badge>{quiz.questions.length} câu hỏi</Badge>
                      {quiz.timeLimitMinutes && (
                        <Badge>{quiz.timeLimitMinutes} phút</Badge>
                      )}
                      <Badge>Đạt {quiz.passingScore}%</Badge>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {submitted ? (
                      <>
                        <Badge variant="success">
                          Đã nộp · {attempt.score?.toFixed(1)}%
                        </Badge>
                        <Link href={`/quizzes/${quiz.id}/result/${attempt.id}`}>
                          <Button variant="secondary" size="sm">
                            Xem kết quả
                          </Button>
                        </Link>
                      </>
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
                </div>
              </Card>
            );
          })}
        </div>

        {!loading && quizzes.length === 0 && (
          <div className="empty-state">
            <p className="font-medium text-slate-700">Chưa có bài kiểm tra nào.</p>
            <p className="mt-2 text-sm text-slate-500">
              Khi giáo viên ghi danh bạn vào bài kiểm tra, bài sẽ hiển thị ngay
              tại đây sau khi đăng nhập.
            </p>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
