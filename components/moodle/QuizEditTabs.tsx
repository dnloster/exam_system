"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";

export default function QuizEditTabs({ quizTitle }: { quizTitle: string }) {
  const params = useParams();
  const pathname = usePathname();
  const quizId = params.id;

  const tabs = [
    { href: `/teacher/quizzes/${quizId}/settings`, label: "Cài đặt" },
    { href: `/teacher/quizzes/${quizId}/questions`, label: "Chỉnh sửa câu hỏi" },
    { href: `/teacher/quizzes/${quizId}/question-bank`, label: "Ngân hàng câu hỏi" },
    { href: `/teacher/quizzes/${quizId}/preview`, label: "Xem trước đề" },
    { href: `/teacher/quizzes/${quizId}/participants`, label: "Ghi danh" },
    { href: `/teacher/quizzes/${quizId}/grades`, label: "Tổng hợp điểm" },
  ];

  return (
    <div className="mb-6">
      <div className="mb-3 text-sm text-slate-500">
        <Link href="/teacher/quizzes" className="link-primary">
          Danh sách bài kiểm tra
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-slate-800">{quizTitle}</span>
      </div>
      <div className="tab-list">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn("tab", active && "tab-active")}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
