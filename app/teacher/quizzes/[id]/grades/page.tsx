"use client";

import { useParams } from "next/navigation";
import QuizGradesSummary from "@/components/moodle/QuizGradesSummary";

export default function QuizGradesPage() {
  const params = useParams();
  const quizId = Number(params.id);

  return <QuizGradesSummary quizId={quizId} />;
}
