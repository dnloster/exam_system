"use client";

import Modal from "@/components/ui/Modal";
import MoodleQuestionEditor, {
  MoodleQuestionData,
} from "./MoodleQuestionEditor";

type QuestionEditorModalProps = {
  open: boolean;
  onClose: () => void;
  editing: boolean;
  questionId?: number;
  categoryName?: string;
  categories: string[];
  initial?: Partial<MoodleQuestionData>;
  onSubmit: (data: MoodleQuestionData) => Promise<void>;
  submitLabel?: string;
};

export default function QuestionEditorModal({
  open,
  onClose,
  editing,
  questionId,
  categoryName,
  categories,
  initial,
  onSubmit,
  submitLabel = "Lưu vào ngân hàng câu hỏi",
}: QuestionEditorModalProps) {
  const editorKey = editing ? `edit-${questionId}` : "new";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        editing
          ? "Chỉnh sửa câu hỏi trong ngân hàng"
          : "Tạo câu hỏi mới trong ngân hàng"
      }
      description={
        categoryName ? `Danh mục: ${categoryName}` : undefined
      }
      size="xl"
    >
      <MoodleQuestionEditor
        key={editorKey}
        embedded
        categories={categories}
        initial={initial}
        onSubmit={onSubmit}
        onCancel={onClose}
        submitLabel={submitLabel}
      />
    </Modal>
  );
}
