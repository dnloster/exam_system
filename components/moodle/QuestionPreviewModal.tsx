"use client";

import Modal from "@/components/ui/Modal";
import QuestionPreview, { PreviewQuestion } from "@/components/quiz/QuestionPreview";

type QuestionPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  question: PreviewQuestion | null;
  title?: string;
};

export default function QuestionPreviewModal({
  open,
  onClose,
  question,
  title = "Xem trước câu hỏi",
}: QuestionPreviewModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      {question ? (
        <QuestionPreview question={question} showCorrectAnswers />
      ) : (
        <p className="text-sm text-slate-500">Không có dữ liệu câu hỏi.</p>
      )}
    </Modal>
  );
}
