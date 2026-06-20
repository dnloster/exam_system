"use client";

import Link from "next/link";
import { useState } from "react";
import UnifiedQuestionEditor from "./UnifiedQuestionEditor";
import QuestionPreviewModal from "./QuestionPreviewModal";
import QuestionBankPickerModal from "./QuestionBankPickerModal";
import RandomQuestionModal from "./RandomQuestionModal";
import Button from "@/components/ui/Button";
import type { QuestionFormData } from "@/lib/question-payload";
import { getQuestionTypeLabel } from "@/lib/question-types";
import type { PreviewQuestion } from "@/components/quiz/QuestionPreview";

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
  maxGrade: number;
  categories: string[];
  onRefresh: () => Promise<void>;
};

export default function QuizQuestionsManager({
  quizId,
  questions,
  maxGrade,
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

  const attachedQuestionIds = questions
    .filter((q) => (q.slotType ?? "FIXED") === "FIXED" && q.questionId != null)
    .map((q) => q.questionId!);

  const randomSlotCount = questions.filter(
    (q) => (q.slotType ?? "FIXED") === "RANDOM"
  ).length;

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
  }

  async function removeSlot(slot: QuizQuestion) {
    const label =
      (slot.slotType ?? "FIXED") === "RANDOM"
        ? "Gỡ slot câu hỏi ngẫu nhiên khỏi bài kiểm tra?"
        : "Gỡ câu hỏi khỏi bài kiểm tra?";
    if (!confirm(label)) return;
    await fetch(`/api/quizzes/${quizId}/questions?quizQuestionId=${slot.id}`, {
      method: "DELETE",
    });
    await onRefresh();
  }

  async function moveQuestion(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= questions.length) return;
    const slotIds = [...questions.map((q) => q.id)];
    [slotIds[index], slotIds[newIndex]] = [slotIds[newIndex], slotIds[index]];
    await fetch(`/api/quizzes/${quizId}/questions/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotIds }),
    });
    await onRefresh();
  }

  return (
    <div>
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
          | <strong>Tổng điểm tối đa (ước tính):</strong> {maxGrade}
        </p>
        <Link href={`/teacher/quizzes/${quizId}/preview`}>
          <Button type="button" variant="secondary" size="sm">
            Xem trước đề thi
          </Button>
        </Link>
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
          />
        </div>
      )}

      <div className="overflow-x-auto rounded border border-gray-300">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#e9ecef] text-left">
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
                  colSpan={5}
                  className="border border-gray-300 px-4 py-8 text-center text-gray-500"
                >
                  Chưa có câu hỏi. Nhấn <strong>Thêm</strong> để thêm câu hỏi.
                </td>
              </tr>
            ) : (
              questions.map((q, index) => {
                const isRandom = (q.slotType ?? "FIXED") === "RANDOM";

                return (
                  <tr key={q.id} className="bg-white hover:bg-[#f8f9fa]">
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
                      {isRandom
                        ? q.estimatedMaxPoints != null
                          ? `≤${q.estimatedMaxPoints}`
                          : "?"
                        : q.question?.points}
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
                  Tổng điểm (ước tính)
                </td>
                <td className="border border-gray-300 px-2 py-2 text-center">
                  {maxGrade}
                </td>
                <td className="border border-gray-300" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
