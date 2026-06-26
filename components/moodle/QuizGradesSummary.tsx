"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { QUIZ_TOTAL_POINTS } from "@/lib/quiz-points";
import { GRADE_GOOD_MIN, gradeLabel } from "@/lib/grade-scale";

type GradeRow = {
  userId: number;
  fullName: string;
  username: string;
  unitName: string | null;
  enrolled: boolean;
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED";
  score: number | null;
  pointsEarned: number | null;
  passed: boolean | null;
  startedAt: string | null;
  submittedAt: string | null;
  attemptId: number | null;
};

type GradesData = {
  quiz: {
    id: number;
    title: string;
    passingScore: number;
    questionCount: number;
  };
  summary: {
    submittedCount: number;
    inProgressCount: number;
    notStartedCount: number;
    passCount: number;
    passRate: number | null;
    goodOrAboveCount: number;
    goodOrAboveRate: number | null;
    belowPassCount: number;
    belowPassRate: number | null;
    maxPoints: number;
  };
  rows: GradeRow[];
};

type QuizGradesSummaryProps = {
  quizId: number;
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: GradeRow["status"]) {
  switch (status) {
    case "SUBMITTED":
      return <Badge variant="success">Đã nộp</Badge>;
    case "IN_PROGRESS":
      return <Badge variant="warning">Đang làm</Badge>;
    default:
      return <Badge variant="muted">Chưa làm</Badge>;
  }
}

function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: string;
  tone: "emerald" | "sky" | "violet" | "rose";
}) {
  const tones = {
    emerald: {
      card: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white",
      icon: "bg-emerald-100 text-emerald-700",
      value: "text-emerald-800",
      label: "text-emerald-700/80",
    },
    sky: {
      card: "border-sky-200/80 bg-gradient-to-br from-sky-50 to-white",
      icon: "bg-sky-100 text-sky-700",
      value: "text-sky-900",
      label: "text-sky-700/80",
    },
    violet: {
      card: "border-violet-200/80 bg-gradient-to-br from-violet-50 to-white",
      icon: "bg-violet-100 text-violet-700",
      value: "text-violet-900",
      label: "text-violet-700/80",
    },
    rose: {
      card: "border-rose-200/80 bg-gradient-to-br from-rose-50 to-white",
      icon: "bg-rose-100 text-rose-700",
      value: "text-rose-800",
      label: "text-rose-700/80",
    },
  } as const;

  const t = tones[tone];

  return (
    <Card className={cn("border p-4 shadow-sm", t.card)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-xs font-semibold uppercase tracking-wide", t.label)}>
            {label}
          </p>
          <p className={cn("mt-2 text-3xl font-bold tabular-nums", t.value)}>
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-600">{hint}</p>
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg",
            t.icon
          )}
          aria-hidden
        >
          {icon}
        </span>
      </div>
    </Card>
  );
}

function scoreTone(
  score: number,
  passingScore: number
): "emerald" | "sky" | "violet" | "amber" | "rose" {
  const label = gradeLabel(score, passingScore);
  if (label === "Giỏi") return "emerald";
  if (label === "Khá") return "violet";
  if (label === "Đạt") return "sky";
  if (label === "Không đạt") return "rose";
  return "amber";
}

const scorePillClass = {
  emerald: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  sky: "bg-sky-100 text-sky-800 ring-sky-200",
  violet: "bg-violet-100 text-violet-800 ring-violet-200",
  amber: "bg-amber-100 text-amber-800 ring-amber-200",
  rose: "bg-rose-100 text-rose-800 ring-rose-200",
} as const;

function resultPill(score: number | null, passingScore: number, passed: boolean | null) {
  if (score == null || passed == null) return "—";

  const label = gradeLabel(score, passingScore);
  const tone = scoreTone(score, passingScore);

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        scorePillClass[tone]
      )}
    >
      {label}
    </span>
  );
}

export default function QuizGradesSummary({ quizId }: QuizGradesSummaryProps) {
  const [data, setData] = useState<GradesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/quizzes/${quizId}/grades`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Không thể tải bảng điểm");
        }
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [quizId]);

  if (loading) {
    return <Card className="p-6 text-slate-500">Đang tải bảng điểm...</Card>;
  }

  if (error || !data) {
    return (
      <Card className="p-6 text-red-600">
        {error || "Không tìm thấy dữ liệu điểm"}
      </Card>
    );
  }

  const { quiz, summary, rows } = data;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-portal-primary/15 bg-gradient-to-r from-portal-primary/10 via-sky-50 to-violet-50 px-5 py-4 sm:px-6">
        <h2 className="text-lg font-semibold text-slate-900">Tổng hợp điểm</h2>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-white/80 px-3 py-1 text-slate-700 ring-1 ring-slate-200/80">
            Điểm đạt: <strong className="text-portal-primary">{quiz.passingScore}%</strong>
          </span>
          <span className="rounded-full bg-white/80 px-3 py-1 text-slate-700 ring-1 ring-slate-200/80">
            Tổng điểm: <strong>{QUIZ_TOTAL_POINTS}</strong>
          </span>
          <span className="rounded-full bg-white/80 px-3 py-1 text-slate-700 ring-1 ring-slate-200/80">
            {quiz.questionCount} câu hỏi
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          tone="emerald"
          icon="📋"
          label="Đã nộp bài"
          value={String(summary.submittedCount)}
          hint={`${summary.inProgressCount} đang làm · ${summary.notStartedCount} chưa làm`}
        />
        <StatCard
          tone="sky"
          icon="✓"
          label="Tỷ lệ đạt"
          value={
            summary.passRate != null ? `${summary.passRate.toFixed(0)}%` : "—"
          }
          hint={`${summary.passCount}/${summary.submittedCount} người (≥${quiz.passingScore}%)`}
        />
        <StatCard
          tone="violet"
          icon="★"
          label="Tỷ lệ khá trở lên"
          value={
            summary.goodOrAboveRate != null
              ? `${summary.goodOrAboveRate.toFixed(0)}%`
              : "—"
          }
          hint={`${summary.goodOrAboveCount}/${summary.submittedCount} người (≥${GRADE_GOOD_MIN}%)`}
        />
        <StatCard
          tone="rose"
          icon="!"
          label="Tỷ lệ dưới không đạt"
          value={
            summary.belowPassRate != null
              ? `${summary.belowPassRate.toFixed(0)}%`
              : "—"
          }
          hint={`${summary.belowPassCount}/${summary.submittedCount} người (<${quiz.passingScore}%)`}
        />
      </div>

      {rows.length === 0 ? (
        <Card className="empty-state">
          <p className="text-slate-600">
            Chưa có người ghi danh hoặc nộp bài. Hãy ghi danh thành viên trong
            tab Ghi danh.
          </p>
          <Link
            href={`/teacher/quizzes/${quizId}/participants`}
            className="link-primary mt-3 inline-block"
          >
            Đi tới ghi danh →
          </Link>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-sm font-medium text-slate-700">
              Bảng điểm chi tiết ·{" "}
              <span className="text-slate-500">{rows.length} người</span>
            </p>
          </div>
          <div className="table-wrap rounded-none border-0 shadow-none">
            <table className="data-table">
              <thead>
                <tr className="bg-slate-50/60">
                  <th>Họ tên</th>
                  <th className="w-32">Tài khoản</th>
                  <th className="w-36">Đơn vị</th>
                  <th className="w-28">Trạng thái</th>
                  <th className="w-28 text-center">Điểm (%)</th>
                  <th className="w-28 text-center">
                    Điểm /{QUIZ_TOTAL_POINTS}
                  </th>
                  <th className="w-28 text-center">Xếp loại</th>
                  <th className="w-40">Nộp lúc</th>
                  <th className="w-24">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const tone =
                    row.score != null
                      ? scoreTone(row.score, quiz.passingScore)
                      : null;

                  return (
                    <tr
                      key={row.userId}
                      className={cn(
                        index % 2 === 1 && "bg-slate-50/40",
                        row.status === "SUBMITTED" &&
                          row.passed === false &&
                          "bg-rose-50/30",
                        row.score != null &&
                          gradeLabel(row.score, quiz.passingScore) === "Giỏi" &&
                          "bg-emerald-50/25"
                      )}
                    >
                      <td className="font-medium text-slate-900">
                        {row.fullName}
                      </td>
                      <td className="text-sm text-slate-600">{row.username}</td>
                      <td className="text-sm text-slate-600">
                        {row.unitName ?? "—"}
                      </td>
                      <td>{statusBadge(row.status)}</td>
                      <td className="text-center">
                        {row.score != null && tone ? (
                          <span
                            className={cn(
                              "inline-flex min-w-[3.5rem] justify-center rounded-full px-2 py-0.5 text-sm font-semibold tabular-nums ring-1 ring-inset",
                              scorePillClass[tone]
                            )}
                          >
                            {row.score.toFixed(1)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-center font-medium text-slate-700">
                        {row.pointsEarned != null
                          ? row.pointsEarned.toFixed(2).replace(/\.?0+$/, "")
                          : "—"}
                      </td>
                      <td className="text-center">
                        {resultPill(row.score, quiz.passingScore, row.passed)}
                      </td>
                      <td className="text-sm text-slate-600">
                        {formatDateTime(row.submittedAt)}
                      </td>
                      <td>
                        {row.attemptId && row.status === "SUBMITTED" ? (
                          <Link
                            href={`/teacher/attempts/${row.attemptId}`}
                            className="link-primary text-sm font-medium"
                          >
                            Xem
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
