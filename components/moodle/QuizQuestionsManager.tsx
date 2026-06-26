"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import UnifiedQuestionEditor from "./UnifiedQuestionEditor";
import QuestionPreviewModal from "./QuestionPreviewModal";
import QuestionBankPickerModal from "./QuestionBankPickerModal";
import RandomQuestionModal from "./RandomQuestionModal";
import Button from "@/components/ui/Button";
import type { QuestionFormData } from "@/lib/question-payload";
import { getQuestionTypeLabel } from "@/lib/question-types";
import type { PreviewQuestion } from "@/components/quiz/QuestionPreview";
import { confirmDelete, showError, showSuccess } from "@/lib/swal";
import {
  QUIZ_TOTAL_POINTS,
  pointsPerSlot,
  formatQuizPoints,
} from "@/lib/quiz-points";

type Question = {
  id: number;
  name: string | null;
  content: string;
  points: number;
  type: string;
  questionCategory?: { id: number; name: string } | null;
};

type QuizQuestion = {
  id: number;
  slotType?: "FIXED" | "RANDOM";
  questionId: number | null;
  order: number;
  includeSubcategories?: boolean;
  poolSize?: number;
  estimatedMaxPoints?: number;
  randomCategory?: { id: number; name: string } | null;
  question: Question | null;
};

type QuizQuestionsManagerProps = {
  quizId: number;
  questions: QuizQuestion[];
  categories: string[];
  onRefresh: () => Promise<void>;
};

export default function QuizQuestionsManager({
  quizId,
  questions,
  categories,
  onRefresh,
}: QuizQuestionsManagerProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [mode, setMode] = useState<"none" | "new">("none");
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<PreviewQuestion | null>(
    null
  );
  const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null);
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const perQuestionPoints = pointsPerSlot(questions.length);

  const attachedQuestionIds = questions
    .filter((q) => (q.slotType ?? "FIXED") === "FIXED" && q.questionId != null)
    .map((q) => q.questionId!);

  const randomSlotCount = questions.filter(
    (q) => (q.slotType ?? "FIXED") === "RANDOM"
  ).length;

  const allSelected =
    questions.length > 0 && selectedSlotIds.size === questions.length;
  const someSelected = selectedSlotIds.size > 0;

  const selectedSummary = useMemo(() => {
    const selected = questions.filter((q) => selectedSlotIds.has(q.id));
    const fixed = selected.filter((q) => (q.slotType ?? "FIXED") === "FIXED").length;
    const random = selected.length - fixed;
    return { total: selected.length, fixed, random };
  }, [questions, selectedSlotIds]);

  function toggleSlot(slotId: number) {
    setSelectedSlotIds((prev) => {
      const next = new Set(prev);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedSlotIds(new Set());
    } else {
      setSelectedSlotIds(new Set(questions.map((q) => q.id)));
    }
  }

  async function deleteSlots(slotIds: number[]) {
    if (slotIds.length === 0) return;

    const res = await fetch(`/api/quizzes/${quizId}/questions/bulk-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotIds }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Không thể xóa câu hỏi");
    }

    return res.json() as Promise<{ deleted: number }>;
  }

  async function removeSlot(slot: QuizQuestion) {
    const isRandom = (slot.slotType ?? "FIXED") === "RANDOM";
    const label = isRandom
      ? "Gỡ slot câu hỏi ngẫu nhiên khỏi bài kiểm tra?"
      : "Gỡ câu hỏi khỏi bài kiểm tra?";

    const confirmed = await confirmDelete(label);
    if (!confirmed) return;

    try {
      const result = await deleteSlots([slot.id]);
      setSelectedSlotIds((prev) => {
        const next = new Set(prev);
        next.delete(slot.id);
        return next;
      });
      await onRefresh();
      await showSuccess(
        `Đã gỡ ${result?.deleted ?? 1} câu hỏi khỏi đề thi.`
      );
    } catch (e) {
      await showError(
        e instanceof Error ? e.message : "Không thể xóa câu hỏi"
      );
    }
  }

  async function removeSelected() {
    const slotIds = Array.from(selectedSlotIds);
    if (slotIds.length === 0) return;

    const { total, fixed, random } = selectedSummary;
    const parts: string[] = [];
    if (fixed > 0) parts.push(`${fixed} câu hỏi`);
    if (random > 0) parts.push(`${random} slot ngẫu nhiên`);

    const confirmed = await confirmDelete(
      `Xóa ${total} mục đã chọn (${parts.join(", ")}) khỏi đề thi?`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const result = await deleteSlots(slotIds);
      setSelectedSlotIds(new Set());
      await onRefresh();
      await showSuccess(`Đã gỡ ${result?.deleted ?? slotIds.length} mục khỏi đề thi.`);
    } catch (e) {
      await showError(
        e instanceof Error ? e.message : "Không thể xóa các câu hỏi đã chọn"
      );
    } finally {
      setDeleting(false);
    }
  }

  async function openQuestionPreview(questionId: number) {
    setPreviewLoadingId(questionId);
    const res = await fetch(`/api/questions/${questionId}`);
    if (res.ok) {
      const q = await res.json();
      setPreviewQuestion({
        name: q.name,
        content: q.content,
        points: q.points,
        shuffleAnswers: q.shuffleAnswers,
        generalFeedback: q.generalFeedback,
        type: q.type,
        configJson: q.configJson,
        options: q.options,
      });
    } else {
      await showError("Không thể tải xem trước câu hỏi");
    }
    setPreviewLoadingId(null);
  }

  function openBankPicker() {
    setShowAddMenu(false);
    setShowBankPicker(true);
  }

  function openRandomModal() {
    setShowAddMenu(false);
    setShowRandomModal(true);
  }

  async function createAndAttach(data: QuestionFormData) {
    const res = await fetch(`/api/quizzes/${quizId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Không thể thêm câu hỏi");
    }
    await onRefresh();
    await showSuccess("Đã thêm câu hỏi vào đề thi.");
  }

  async function moveQuestion(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= questions.length) return;
    const slotIds = [...questions.map((q) => q.id)];
    [slotIds[index], slotIds[newIndex]] = [slotIds[newIndex], slotIds[index]];
    const res = await fetch(`/api/quizzes/${quizId}/questions/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotIds }),
    });
    if (!res.ok) {
      await showError("Không thể sắp xếp lại câu hỏi");
      return;
    }
    await onRefresh();
  }

  return (
    <div className={someSelected ? "pb-20" : undefined}>
      <QuestionPreviewModal
        open={!!previewQuestion}
        onClose={() => setPreviewQuestion(null)}
        question={previewQuestion}
      />

      <QuestionBankPickerModal
        open={showBankPicker}
        onClose={() => setShowBankPicker(false)}
        quizId={quizId}
        attachedQuestionIds={attachedQuestionIds}
        onAttached={onRefresh}
      />

      <RandomQuestionModal
        open={showRandomModal}
        onClose={() => setShowRandomModal(false)}
        quizId={quizId}
        attachedQuestionIds={attachedQuestionIds}
        onAdded={onRefresh}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-gray-300 bg-[#f8f9fa] p-4 text-sm">
        <p>
          <strong>Câu hỏi:</strong> {questions.length}
          {randomSlotCount > 0 && (
            <>
              {" "}
              (🎲 {randomSlotCount} ngẫu nhiên)
            </>
          )}{" "}
          | <strong>Tổng điểm:</strong>{" "}
          {questions.length > 0 ? QUIZ_TOTAL_POINTS : 0}
          {questions.length > 0 && (
            <>
              {" "}
              (mỗi câu: {formatQuizPoints(perQuestionPoints)})
            </>
          )}
          {someSelected && (
            <>
              {" "}
              | <strong>Đã chọn:</strong> {selectedSlotIds.size}
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/teacher/quizzes/${quizId}/preview`}>
            <Button type="button" variant="secondary" size="sm">
              Xem trước đề thi
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative mb-4">
        <button
          type="button"
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="rounded bg-[#0f6cbf] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d5aa7]"
        >
          Thêm ▼
        </button>
        {showAddMenu && (
          <div className="absolute left-0 top-full z-10 mt-1 min-w-[240px] rounded border border-gray-300 bg-white shadow-lg">
            <button
              type="button"
              onClick={() => {
                setMode("new");
                setShowAddMenu(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-[#e9ecef]"
            >
              một câu hỏi mới...
            </button>
            <button
              type="button"
              onClick={openBankPicker}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-[#e9ecef]"
            >
              từ ngân hàng câu hỏi...
            </button>
            <button
              type="button"
              onClick={openRandomModal}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-[#e9ecef]"
            >
              câu hỏi ngẫu nhiên...
            </button>
            <Link
              href={`/teacher/quizzes/${quizId}/question-bank`}
              className="block w-full border-t px-4 py-2 text-left text-sm text-[#0f6cbf] hover:bg-[#e9ecef]"
            >
              quản lý ngân hàng câu hỏi →
            </Link>
          </div>
        )}
      </div>

      {mode === "new" && (
        <div className="mb-6">
          <UnifiedQuestionEditor
            categories={categories}
            onSubmit={createAndAttach}
            onCancel={() => setMode("none")}
            submitLabel="Lưu thay đổi"
            hidePoints
          />
        </div>
      )}

      <div className="overflow-x-auto rounded border border-gray-300">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#e9ecef] text-left">
              <th className="border border-gray-300 px-2 py-2 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  disabled={questions.length === 0}
                  title="Chọn tất cả"
                  aria-label="Chọn tất cả"
                />
              </th>
              <th className="border border-gray-300 px-2 py-2 w-10" />
              <th className="border border-gray-300 px-2 py-2">Câu hỏi</th>
              <th className="border border-gray-300 px-2 py-2 w-32">Loại</th>
              <th className="border border-gray-300 px-2 py-2 w-20">Điểm</th>
              <th className="border border-gray-300 px-2 py-2 w-40">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {questions.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="border border-gray-300 px-4 py-8 text-center text-gray-500"
                >
                  Chưa có câu hỏi. Nhấn <strong>Thêm</strong> để thêm câu hỏi.
                </td>
              </tr>
            ) : (
              questions.map((q, index) => {
                const isRandom = (q.slotType ?? "FIXED") === "RANDOM";
                const isSelected = selectedSlotIds.has(q.id);

                return (
                  <tr
                    key={q.id}
                    className={`bg-white hover:bg-[#f8f9fa] ${isSelected ? "bg-blue-50/60" : ""}`}
                  >
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSlot(q.id)}
                        aria-label={`Chọn câu hỏi ${index + 1}`}
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center text-gray-400">
                      {isRandom ? "🎲" : "⋮⋮"}
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      {isRandom ? (
                        <>
                          <span className="font-medium text-gray-800">
                            {index + 1}. Câu hỏi ngẫu nhiên
                          </span>
                          <p className="mt-1 text-xs text-gray-600">
                            Danh mục:{" "}
                            <strong>{q.randomCategory?.name ?? "—"}</strong>
                            {q.includeSubcategories && " (kèm danh mục con)"}
                            {q.poolSize != null && (
                              <> · {q.poolSize} câu khả dụng</>
                            )}
                          </p>
                        </>
                      ) : (
                        <>
                          <span className="font-medium text-gray-800">
                            {index + 1}.{" "}
                            {q.question?.name || q.question?.content}
                          </span>
                          {q.question?.name && (
                            <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                              {q.question.content}
                            </p>
                          )}
                        </>
                      )}
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      {isRandom
                        ? "Ngẫu nhiên"
                        : getQuestionTypeLabel(q.question?.type ?? "")}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {questions.length > 0
                        ? formatQuizPoints(perQuestionPoints)
                        : "—"}
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        {!isRandom && q.questionId != null && (
                          <button
                            type="button"
                            onClick={() => openQuestionPreview(q.questionId!)}
                            disabled={previewLoadingId === q.questionId}
                            className="rounded px-1 text-[#0f6cbf] hover:bg-blue-50 disabled:opacity-50"
                            title="Xem trước"
                          >
                            {previewLoadingId === q.questionId ? "…" : "👁"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => moveQuestion(index, -1)}
                          disabled={index === 0}
                          className="rounded px-1 hover:bg-gray-200 disabled:opacity-30"
                          title="Di chuyển lên"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(index, 1)}
                          disabled={index === questions.length - 1}
                          className="rounded px-1 hover:bg-gray-200 disabled:opacity-30"
                          title="Di chuyển xuống"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSlot(q)}
                          className="rounded px-1 text-red-600 hover:bg-red-50"
                          title="Xóa"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {questions.length > 0 && (
            <tfoot>
              <tr className="bg-[#e9ecef] font-medium">
                <td colSpan={3} className="border border-gray-300 px-2 py-2 text-right">
                  Tổng điểm
                </td>
                <td className="border border-gray-300 px-2 py-2 text-center">
                  {questions.length > 0 ? QUIZ_TOTAL_POINTS : 0}
                </td>
                <td className="border border-gray-300" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {someSelected && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-red-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-700">
              Đã chọn <strong>{selectedSlotIds.size}</strong> mục
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={deleting}
                onClick={() => setSelectedSlotIds(new Set())}
              >
                Bỏ chọn
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={deleting}
                onClick={removeSelected}
                className="!border-red-300 !text-red-600 hover:!bg-red-50"
              >
                {deleting
                  ? "Đang xóa..."
                  : `Xóa đã chọn (${selectedSlotIds.size})`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
