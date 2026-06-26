"use client";

import { useParams } from "next/navigation";
import QuizParticipantsManager from "@/components/moodle/QuizParticipantsManager";

export default function QuizParticipantsPage() {
  const params = useParams();
  const quizId = Number(params.id);

  return (
    <div>
      <QuizParticipantsManager quizId={quizId} />
    </div>
  );
}
