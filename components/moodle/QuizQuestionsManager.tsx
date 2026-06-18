"use client";

import Link from "next/link";
import { useState } from "react";
import MoodleQuestionEditor, {
  MoodleQuestionData,
} from "./MoodleQuestionEditor";
import QuestionPreviewModal from "./QuestionPreviewModal";
import Button from "@/components/ui/Button";
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
  questionId: number;
  order: number;
  question: Question;
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
  const [mode, setMode] = useState<"none" | "new" | "bank">("none");
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [selectedBankIds, setSelectedBankIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<PreviewQuestion | null>(
    null
  );
  const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null);

  const attachedIds = new Set(questions.map((q) => q.questionId));

  async function loadBank() {
    const res = await fetch(`/api/questions?quizId=${quizId}`);
    if (res.ok) {
      const all: Question[] = await res.json();
      setBankQuestions(all.filter((q) => !attachedIds.has(q.id)));
    }
  }

  async function openBankPicker() {
    setMode("bank");
    setShowAddMenu(false);
    await loadBank();
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
        options: q.options,
      });
    }
    setPreviewLoadingId(null);
  }

  async function attachFromBank() {
    setLoading(true);
    for (const id of selectedBankIds) {
      await fetch(`/api/quizzes/${quizId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: id }),
      });
    }
    setSelectedBankIds([]);
    setMode("none");
    await onRefresh();
    setLoading(false);
  }

  async function createAndAttach(data: MoodleQuestionData) {
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

  async function removeQuestion(questionId: number) {
    if (!confirm("Gỡ câu hỏi khỏi bài kiểm tra?")) return;
    await fetch(`/api/quizzes/${quizId}/questions?questionId=${questionId}`, {
      method: "DELETE",
    });
    await onRefresh();
  }

  async function moveQuestion(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= questions.length) return;
    const ids = [...questions.map((q) => q.questionId)];
    [ids[index], ids[newIndex]] = [ids[newIndex], ids[index]];
    await fetch(`/api/quizzes/${quizId}/questions/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIds: ids }),
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-gray-300 bg-[#f8f9fa] p-4 text-sm">
        <p>
          <strong>Câu hỏi:</strong> {questions.length} |{" "}
          <strong>Tổng điểm tối đa:</strong> {maxGrade}
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
          <MoodleQuestionEditor
            categories={categories}
            onSubmit={createAndAttach}
            onCancel={() => setMode("none")}
            submitLabel="Lưu thay đổi"
          />
        </div>
      )}

      {mode === "bank" && (
        <div className="mb-6 rounded border border-gray-300 bg-white p-4">
          <h3 className="mb-3 font-semibold">Chọn từ ngân hàng câu hỏi</h3>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {bankQuestions.length === 0 ? (
              <p className="text-sm text-gray-500">Không còn câu hỏi khả dụng.</p>
            ) : (
              bankQuestions.map((q) => (
                <label
                  key={q.id}
                  className="flex cursor-pointer items-start gap-2 rounded border p-2 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedBankIds.includes(q.id)}
                    onChange={(e) => {
                      setSelectedBankIds((prev) =>
                        e.target.checked
                          ? [...prev, q.id]
                          : prev.filter((id) => id !== q.id)
                      );
                    }}
                  />
                  <span className="text-sm">
                    <strong>{q.name || q.content.slice(0, 60)}</strong>
                    <br />
                    <span className="text-gray-600">
                      {q.questionCategory?.name ?? "Mặc định"} · {q.points} điểm · Trắc nghiệm
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={loading || selectedBankIds.length === 0}
              onClick={attachFromBank}
              className="rounded bg-[#0f6cbf] px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Thêm câu hỏi đã chọn
            </button>
            <button
              type="button"
              onClick={() => setMode("none")}
              className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Hủy
            </button>
          </div>
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
              questions.map((q, index) => (
                <tr key={q.id} className="bg-white hover:bg-[#f8f9fa]">
                  <td className="border border-gray-300 px-2 py-2 text-center text-gray-400">
                    ⋮⋮
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <span className="font-medium text-gray-800">
                      {index + 1}. {q.question.name || q.question.content}
                    </span>
                    {q.question.name && (
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                        {q.question.content}
                      </p>
                    )}
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    Trắc nghiệm
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    {q.question.points}
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => openQuestionPreview(q.questionId)}
                        disabled={previewLoadingId === q.questionId}
                        className="rounded px-1 text-[#0f6cbf] hover:bg-blue-50 disabled:opacity-50"
                        title="Xem trước"
                      >
                        {previewLoadingId === q.questionId ? "…" : "👁"}
                      </button>
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
                        onClick={() => removeQuestion(q.questionId)}
                        className="rounded px-1 text-red-600 hover:bg-red-50"
                        title="Xóa"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {questions.length > 0 && (
            <tfoot>
              <tr className="bg-[#e9ecef] font-medium">
                <td colSpan={3} className="border border-gray-300 px-2 py-2 text-right">
                  Tổng điểm
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
