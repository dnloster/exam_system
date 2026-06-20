"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import QuestionPreviewModal from "./QuestionPreviewModal";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { buildCategoryTree, type CategoryTreeNode } from "@/lib/category-tree";
import { getQuestionTypeLabel } from "@/lib/question-types";
import type { PreviewQuestion } from "@/components/quiz/QuestionPreview";

type Category = {
  id: number;
  name: string;
  parentId: number | null;
  _count: { questions: number; children?: number };
};

type BankQuestion = {
  id: number;
  name: string | null;
  content: string;
  points: number;
  type: string;
  questionCategory: { id: number; name: string } | null;
};

type QuestionBankPickerModalProps = {
  open: boolean;
  onClose: () => void;
  quizId: number;
  attachedQuestionIds: number[];
  onAttached: () => Promise<void>;
};

function matchesSearch(question: BankQuestion, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = `${question.name ?? ""} ${question.content}`.toLowerCase();
  return haystack.includes(q);
}

function categoryOptionLabel(cat: CategoryTreeNode) {
  const indent = cat.depth > 0 ? `${"—".repeat(cat.depth)} ` : "";
  return `${indent}${cat.name} (${cat._count.questions})`;
}

export default function QuestionBankPickerModal({
  open,
  onClose,
  quizId,
  attachedQuestionIds,
  onAttached,
}: QuestionBankPickerModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [includeSubcategories, setIncludeSubcategories] = useState(false);
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [previewQuestion, setPreviewQuestion] = useState<PreviewQuestion | null>(
    null
  );
  const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null);

  const attachedSet = useMemo(
    () => new Set(attachedQuestionIds),
    [attachedQuestionIds]
  );

  const categoryTree = useMemo(
    () => buildCategoryTree(categories),
    [categories]
  );

  const availableQuestions = useMemo(
    () => questions.filter((q) => !attachedSet.has(q.id)),
    [questions, attachedSet]
  );

  const filteredQuestions = useMemo(
    () => availableQuestions.filter((q) => matchesSearch(q, searchQuery)),
    [availableQuestions, searchQuery]
  );

  const allFilteredSelected =
    filteredQuestions.length > 0 &&
    filteredQuestions.every((q) => selectedIds.has(q.id));

  const someFilteredSelected = filteredQuestions.some((q) =>
    selectedIds.has(q.id)
  );

  async function loadCategories() {
    const res = await fetch(`/api/quizzes/${quizId}/categories`);
    if (!res.ok) return;
    const cats: Category[] = await res.json();
    setCategories(cats);
    setSelectedCategoryId((prev) => {
      if (prev && cats.some((c) => c.id === prev)) return prev;
      return cats.length > 0 ? cats[0].id : null;
    });
  }

  async function loadQuestions(categoryId: number | null) {
    if (!categoryId) {
      setQuestions([]);
      return;
    }
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      quizId: String(quizId),
      categoryId: String(categoryId),
    });
    if (includeSubcategories) {
      params.set("includeSubcategories", "true");
    }
    const res = await fetch(`/api/questions?${params}`);
    setLoading(false);
    if (res.ok) {
      setQuestions(await res.json());
      setSelectedIds(new Set());
    } else {
      const data = await res.json();
      setError(data.error ?? "Không thể tải câu hỏi");
    }
  }

  useEffect(() => {
    if (!open) return;
    setSearchQuery("");
    setSelectedIds(new Set());
    setError("");
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quizId]);

  useEffect(() => {
    if (!open || !selectedCategoryId) return;
    loadQuestions(selectedCategoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedCategoryId, includeSubcategories, quizId]);

  useEffect(() => {
    setSelectedIds(new Set());
    setSearchQuery("");
  }, [selectedCategoryId, includeSubcategories]);

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(filteredQuestions.map((q) => q.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function toggleQuestion(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
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
    }
    setPreviewLoadingId(null);
  }

  async function attachSelected() {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/quizzes/${quizId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIds: Array.from(selectedIds) }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Không thể thêm câu hỏi");
      return;
    }
    setSelectedIds(new Set());
    await onAttached();
    onClose();
  }

  const selectedCategory = categoryTree.find((c) => c.id === selectedCategoryId);

  return (
    <>
      <QuestionPreviewModal
        open={!!previewQuestion}
        onClose={() => setPreviewQuestion(null)}
        question={previewQuestion}
      />

      <Modal
        open={open}
        onClose={onClose}
        title="Thêm từ ngân hàng câu hỏi"
        description="Chọn danh mục, tích chọn câu hỏi và thêm vào bài kiểm tra."
        size="xl"
      >
        <div className="flex max-h-[min(70vh,640px)] flex-col gap-4">
          <div className="space-y-3 rounded border border-gray-200 bg-[#f8f9fa] p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label
                  htmlFor="bank-category"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Danh mục câu hỏi
                </label>
                <Select
                  id="bank-category"
                  value={selectedCategoryId ?? ""}
                  onChange={(e) =>
                    setSelectedCategoryId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="w-full border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {categoryTree.length === 0 ? (
                    <option value="">Chưa có danh mục</option>
                  ) : (
                    categoryTree.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {categoryOptionLabel(cat)}
                      </option>
                    ))
                  )}
                </Select>
              </div>
              <Checkbox
                label="Bao gồm danh mục con"
                checked={includeSubcategories}
                onChange={(e) => setIncludeSubcategories(e.target.checked)}
                className="text-sm text-gray-700"
              />
            </div>

            <div>
              <label
                htmlFor="bank-search"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Tìm kiếm
              </label>
              <Input
                id="bank-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên hoặc nội dung câu hỏi..."
                className="border-gray-300 bg-white text-sm"
              />
            </div>

            {selectedCategory && (
              <p className="text-xs text-gray-600">
                Danh mục: <strong>{selectedCategory.path}</strong>
                {includeSubcategories && " (kèm danh mục con)"} ·{" "}
                {loading
                  ? "Đang tải..."
                  : `${filteredQuestions.length} câu hỏi khả dụng`}
                {questions.length > availableQuestions.length && (
                  <>
                    {" "}
                    · {questions.length - availableQuestions.length} câu đã có
                    trong bài kiểm tra
                  </>
                )}
              </p>
            )}
          </div>

          {error && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-auto rounded border border-gray-300">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-[1] bg-[#e9ecef]">
                <tr className="text-left">
                  <th className="w-10 border border-gray-300 px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả"
                      checked={allFilteredSelected}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate =
                            someFilteredSelected && !allFilteredSelected;
                        }
                      }}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      disabled={filteredQuestions.length === 0 || loading}
                    />
                  </th>
                  <th className="border border-gray-300 px-2 py-2">
                    Câu hỏi
                  </th>
                  <th className="w-36 border border-gray-300 px-2 py-2">
                    Loại
                  </th>
                  <th className="w-16 border border-gray-300 px-2 py-2 text-center">
                    Điểm
                  </th>
                  <th className="w-16 border border-gray-300 px-2 py-2 text-center">
                    Xem
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="border border-gray-300 px-4 py-8 text-center text-gray-500"
                    >
                      Đang tải câu hỏi...
                    </td>
                  </tr>
                ) : filteredQuestions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="border border-gray-300 px-4 py-8 text-center text-gray-500"
                    >
                      {questions.length === 0
                        ? "Không có câu hỏi trong danh mục này."
                        : availableQuestions.length === 0
                          ? "Tất cả câu hỏi trong danh mục đã có trong bài kiểm tra."
                          : "Không tìm thấy câu hỏi phù hợp."}
                    </td>
                  </tr>
                ) : (
                  filteredQuestions.map((q) => (
                    <tr key={q.id} className="bg-white hover:bg-[#f8f9fa]">
                      <td className="border border-gray-300 px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(q.id)}
                          onChange={(e) =>
                            toggleQuestion(q.id, e.target.checked)
                          }
                          aria-label={`Chọn câu hỏi ${q.name || q.content.slice(0, 40)}`}
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <span className="font-medium text-gray-800">
                          {q.name || q.content.slice(0, 120)}
                        </span>
                        {q.name && (
                          <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                            {q.content}
                          </p>
                        )}
                        {q.questionCategory && (
                          <p className="mt-1 text-xs text-gray-400">
                            {q.questionCategory.name}
                          </p>
                        )}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-gray-700">
                        {getQuestionTypeLabel(q.type)}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center">
                        {q.points}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => openQuestionPreview(q.id)}
                          disabled={previewLoadingId === q.id}
                          className="rounded px-1 text-[#0f6cbf] hover:bg-blue-50 disabled:opacity-50"
                          title="Xem trước"
                        >
                          {previewLoadingId === q.id ? "…" : "👁"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-3">
            <p className="text-sm text-gray-600">
              {selectedIds.size > 0
                ? `Đã chọn ${selectedIds.size} câu hỏi`
                : "Chưa chọn câu hỏi nào"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submitting || selectedIds.size === 0}
                onClick={attachSelected}
                className="rounded bg-[#0f6cbf] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d5aa7] disabled:opacity-50"
              >
                {submitting
                  ? "Đang thêm..."
                  : "Thêm các câu hỏi đã chọn vào bài kiểm tra"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
