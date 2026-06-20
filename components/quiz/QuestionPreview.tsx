"use client";

import { Card } from "@/components/ui/Card";
import QuestionPreviewBody, {
  type PreviewQuestionData,
} from "./QuestionPreviewBody";

export type PreviewQuestion = PreviewQuestionData;

type QuestionPreviewProps = {
  question: PreviewQuestion;
  index?: number;
  showCorrectAnswers?: boolean;
};

export default function QuestionPreview({
  question,
  index,
  showCorrectAnswers = true,
}: QuestionPreviewProps) {
  return (
    <Card>
      <QuestionPreviewBody
        question={question}
        index={index}
        showCorrectAnswers={showCorrectAnswers}
      />
    </Card>
  );
}
