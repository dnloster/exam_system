"use client";

import { useParams } from "next/navigation";
import QuizQuestionBankManager from "@/components/moodle/QuizQuestionBankManager";

export default function QuizQuestionBankPage() {
  const params = useParams();
  const quizId = Number(params.id);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-800">
        Ngân hàng câu hỏi
      </h2>
      <QuizQuestionBankManager quizId={quizId} />
    </div>
  );
}
