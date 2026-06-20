"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PortalLayout from "@/components/portal/PortalLayout";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";
import { Card, CardBody } from "@/components/ui/Card";

type Quiz = {
  id: number;
  title: string;
  description: string | null;
  timeLimitMinutes: number | null;
  passingScore: number;
  shuffleQuestions: boolean;
  questions: { id: number }[];
  attempts: { id: number; status: string }[];
};

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = Number(params.id);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/quizzes/${quizId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Không thể tải bài kiểm tra");
        }
        return res.json();
      })
      .then(setQuiz)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [quizId]);

  async function startQuiz() {
    setStarting(true);
    setError("");

    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Không thể bắt đầu");
      setStarting(false);
      return;
    }

    router.push(`/quizzes/${quizId}/attempt/${data.id}`);
  }

  if (loading) {
    return (
      <PortalLayout>
        <div className="page-shell text-center text-slate-500">Đang tải...</div>
      </PortalLayout>
    );
  }

  if (!quiz) {
    return (
      <PortalLayout>
        <div className="page-shell text-center text-red-600">
          {error || "Không tìm thấy"}
        </div>
      </PortalLayout>
    );
  }

  const attempt = quiz.attempts[0];

  return (
    <PortalLayout>
      <div className="page-shell max-w-2xl">
        <Card>
          <CardBody>
            <h1 className="text-2xl font-bold text-slate-900">{quiz.title}</h1>
            {quiz.description && (
              <p className="mt-2 text-slate-600">{quiz.description}</p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <Badge>{quiz.questions.length} câu hỏi</Badge>
              {quiz.timeLimitMinutes && (
                <Badge>{quiz.timeLimitMinutes} phút</Badge>
              )}
              <Badge>Đạt {quiz.passingScore}%</Badge>
              <Badge variant={quiz.shuffleQuestions ? "primary" : "muted"}>
                {quiz.shuffleQuestions ? "Xáo trộn câu hỏi" : "Không xáo trộn"}
              </Badge>
            </div>

            {error && (
              <div className="mt-4">
                <Alert variant="error">{error}</Alert>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {attempt?.status === "SUBMITTED" ? (
                <Link href={`/quizzes/${quizId}/result/${attempt.id}`}>
                  <Button>Xem kết quả</Button>
                </Link>
              ) : attempt?.status === "IN_PROGRESS" ? (
                <Link href={`/quizzes/${quizId}/attempt/${attempt.id}`}>
                  <Button>Tiếp tục làm bài</Button>
                </Link>
              ) : (
                <Button onClick={startQuiz} disabled={starting}>
                  {starting ? "Đang bắt đầu..." : "Bắt đầu làm bài"}
                </Button>
              )}
              <Link href="/quizzes">
                <Button variant="secondary">Quay lại</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </PortalLayout>
  );
}
