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
  isPublished: boolean;
  passingScore: number;
  timeLimitMinutes: number | null;
  maxGrade?: number;
  questions: {
    id: number;
    slotType?: "FIXED" | "RANDOM";
    question: { points: number } | null;
  }[];
  _count?: { participants: number };
};

export default function TeacherQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadQuizzes() {
    const res = await fetch("/api/quizzes");
    if (res.ok) setQuizzes(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadQuizzes();
  }, []);

  async function deleteQuiz(id: number) {
    if (!confirm("Xóa bài kiểm tra này?")) return;
    await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
    await loadQuizzes();
  }

  return (
    <PortalLayout>
      <div className="page-shell">
        <PageHeader
          title="Quản lý bài kiểm tra"
          description="Tạo, cấu hình và ghi danh sinh viên cho từng bài kiểm tra"
          actions={
            <Link href="/teacher/quizzes/new">
              <Button>+ Thêm bài kiểm tra</Button>
            </Link>
          }
        />

        {loading ? (
          <Card>
            <p className="text-slate-500">Đang tải...</p>
          </Card>
        ) : quizzes.length === 0 ? (
          <div className="empty-state">
            <p className="text-slate-600">Chưa có bài kiểm tra nào.</p>
            <Link href="/teacher/quizzes/new" className="link-primary mt-4 inline-block">
              Tạo bài kiểm tra đầu tiên →
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th className="w-24 text-center">Câu hỏi</th>
                  <th className="w-24 text-center">Tổng điểm</th>
                  <th className="w-28 text-center">Ghi danh</th>
                  <th className="w-28">Trạng thái</th>
                  <th className="w-48">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.map((quiz) => {
                  const maxGrade =
                    quiz.maxGrade ??
                    quiz.questions.reduce(
                      (s, q) => s + (q.question?.points ?? 0),
                      0
                    );
                  return (
                    <tr key={quiz.id}>
                      <td>
                        <Link
                          href={`/teacher/quizzes/${quiz.id}/questions`}
                          className="link-primary font-semibold"
                        >
                          {quiz.title}
                        </Link>
                        {quiz.description && (
                          <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                            {quiz.description}
                          </p>
                        )}
                      </td>
                      <td className="text-center">{quiz.questions.length}</td>
                      <td className="text-center">{maxGrade}</td>
                      <td className="text-center">
                        {quiz._count?.participants ?? 0}
                      </td>
                      <td>
                        <Badge variant={quiz.isPublished ? "success" : "muted"}>
                          {quiz.isPublished ? "Đang mở" : "Ẩn"}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                          <Link
                            href={`/teacher/quizzes/${quiz.id}/settings`}
                            className="link-primary"
                          >
                            Cài đặt
                          </Link>
                          <Link
                            href={`/teacher/quizzes/${quiz.id}/questions`}
                            className="link-primary"
                          >
                            Câu hỏi
                          </Link>
                          <Link
                            href={`/teacher/quizzes/${quiz.id}/participants`}
                            className="link-primary"
                          >
                            Ghi danh
                          </Link>
                          <Link
                            href={`/teacher/quizzes/${quiz.id}/question-bank`}
                            className="link-primary"
                          >
                            Ngân hàng
                          </Link>
                          <button
                            onClick={() => deleteQuiz(quiz.id)}
                            className="text-red-600 hover:underline"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
