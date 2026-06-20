"use client";

import Modal from "@/components/ui/Modal";
import UnifiedQuestionEditor from "./UnifiedQuestionEditor";
import type { QuestionFormData } from "@/lib/question-payload";

type QuestionEditorModalProps = {
  open: boolean;
  onClose: () => void;
  editing: boolean;
  questionId?: number;
  categoryName?: string;
  categories: string[];
  initial?: Partial<QuestionFormData>;
  onSubmit: (data: QuestionFormData) => Promise<void>;
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
      <UnifiedQuestionEditor
        key={editorKey}
        embedded
        allowTypeChange={!editing}
        categories={categories}
        initial={initial}
        onSubmit={onSubmit}
        onCancel={onClose}
        submitLabel={submitLabel}
      />
    </Modal>
  );
}
