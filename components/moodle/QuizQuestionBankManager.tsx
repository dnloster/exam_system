"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import QuestionEditorModal from "./QuestionEditorModal";
import AikenImportModal from "./AikenImportModal";
import QuestionPreviewModal from "./QuestionPreviewModal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import type { MoodleQuestionData } from "./MoodleQuestionEditor";
import type { PreviewQuestion } from "@/components/quiz/QuestionPreview";
import { optionsToEditorGrades } from "@/lib/question-options";

type Category = {
  id: number;
  name: string;
  _count: { questions: number };
};

type Question = {
  id: number;
  name: string | null;
  content: string;
  points: number;
  type: string;
  questionCategory: { id: number; name: string } | null;
  options: { id: number; text: string; isCorrect: boolean; gradePercent?: number }[];
};

type QuizQuestionBankManagerProps = {
  quizId: number;
};

function toEditorOptions(options: Question["options"]) {
  return optionsToEditorGrades(options);
}

function matchesSearch(question: Question, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = `${question.name ?? ""} ${question.content}`.toLowerCase();
  return haystack.includes(q);
}

export default function QuizQuestionBankManager({
  quizId,
}: QuizQuestionBankManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<PreviewQuestion | null>(
    null
  );
  const [editing, setEditing] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const filteredQuestions = useMemo(
    () => questions.filter((q) => matchesSearch(q, searchQuery)),
    [questions, searchQuery]
  );

  const allFilteredSelected =
    filteredQuestions.length > 0 &&
    filteredQuestions.every((q) => selectedIds.has(q.id));

  const someFilteredSelected = filteredQuestions.some((q) =>
    selectedIds.has(q.id)
  );

  async function loadCategories() {
    const res = await fetch(`/api/quizzes/${quizId}/categories`);
    if (res.ok) {
      const cats: Category[] = await res.json();
      setCategories(cats);
      if (!selectedCategoryId && cats.length > 0) {
        setSelectedCategoryId(cats[0].id);
      }
    }
  }

  async function loadQuestions(categoryId: number | null) {
    if (!categoryId) {
      setQuestions([]);
      return;
    }
    const res = await fetch(
      `/api/questions?quizId=${quizId}&categoryId=${categoryId}`
    );
    if (res.ok) {
      setQuestions(await res.json());
      setSelectedIds(new Set());
    }
  }

  useEffect(() => {
    loadCategories().then(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  useEffect(() => {
    if (selectedCategoryId) loadQuestions(selectedCategoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, quizId]);

  useEffect(() => {
    setSelectedIds(new Set());
    setSearchQuery("");
  }, [selectedCategoryId]);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const res = await fetch(`/api/quizzes/${quizId}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName.trim() }),
    });
    if (res.ok) {
      setNewCategoryName("");
      await loadCategories();
    }
  }

  async function saveQuestion(data: MoodleQuestionData) {
    const payload = {
      ...data,
      categoryId: selectedCategoryId,
      quizId,
    };

    const res = editing
      ? await fetch(`/api/questions/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Không thể lưu câu hỏi");
    }

    setShowQuestionModal(false);
    setEditing(null);
    await loadCategories();
    if (selectedCategoryId) await loadQuestions(selectedCategoryId);
  }

  async function deleteQuestion(id: number) {
    if (!confirm("Xóa câu hỏi khỏi ngân hàng?")) return;
    await fetch(`/api/questions/${id}?quizId=${quizId}`, { method: "DELETE" });
    await loadCategories();
    if (selectedCategoryId) await loadQuestions(selectedCategoryId);
  }

  async function deleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Xóa ${ids.length} câu hỏi đã chọn khỏi ngân hàng?`)) return;

    setDeleting(true);
    for (const id of ids) {
      await fetch(`/api/questions/${id}?quizId=${quizId}`, { method: "DELETE" });
    }
    setDeleting(false);
    await loadCategories();
    if (selectedCategoryId) await loadQuestions(selectedCategoryId);
  }

  function toggleQuestion(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredQuestions.forEach((q) => next.delete(q.id));
      } else {
        filteredQuestions.forEach((q) => next.add(q.id));
      }
      return next;
    });
  }

  const categoryNames = categories.map((c) => c.name);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div>
      <QuestionPreviewModal
        open={!!previewQuestion}
        onClose={() => setPreviewQuestion(null)}
        question={previewQuestion}
      />

      <QuestionEditorModal
        open={showQuestionModal && !!selectedCategoryId}
        onClose={() => {
          setShowQuestionModal(false);
          setEditing(null);
        }}
        editing={!!editing}
        questionId={editing?.id}
        categoryName={selectedCategory?.name}
        categories={categoryNames}
        initial={
          editing
            ? {
                name: editing.name ?? undefined,
                content: editing.content,
                category:
                  editing.questionCategory?.name ?? selectedCategory?.name,
                points: editing.points,
                options: toEditorOptions(editing.options),
              }
            : { category: selectedCategory?.name }
        }
        onSubmit={saveQuestion}
      />

      <AikenImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        quizId={quizId}
        categoryId={selectedCategoryId}
        categoryName={selectedCategory?.name}
        onImported={async () => {
          await loadCategories();
          if (selectedCategoryId) await loadQuestions(selectedCategoryId);
        }}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold text-slate-900">Danh mục câu hỏi</h3>
          <ul className="mb-4 space-y-1">
            {categories.map((cat) => (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={cn(
                    "w-full rounded-xl px-3 py-2 text-left text-sm transition",
                    selectedCategoryId === cat.id
                      ? "bg-portal-primary text-white shadow-sm"
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  {cat.name}{" "}
                  <span className="opacity-80">({cat._count.questions})</span>
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={createCategory} className="flex gap-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Tên danh mục mới"
              className="flex-1"
            />
            <Button type="submit" size="sm">
              Thêm
            </Button>
          </form>
        </Card>

        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-900">
              Câu hỏi trong danh mục
              {selectedCategory && `: ${selectedCategory.name}`}
            </h3>
            <div className="flex flex-wrap gap-2">
              <Link href={`/teacher/quizzes/${quizId}/preview`}>
                <Button type="button" variant="ghost" size="sm">
                  Xem trước đề
                </Button>
              </Link>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowImportModal(true)}
                disabled={!selectedCategoryId}
              >
                Import Aiken
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setShowQuestionModal(true);
                }}
                disabled={!selectedCategoryId}
              >
                + Tạo câu hỏi
              </Button>
            </div>
          </div>

          {selectedCategoryId && (
            <div className="mb-3">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm câu hỏi..."
              />
            </div>
          )}

          {selectedCategoryId && questions.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <Checkbox
                label={
                  allFilteredSelected
                    ? "Bỏ chọn tất cả"
                    : someFilteredSelected
                      ? "Chọn tất cả (kết quả lọc)"
                      : "Chọn tất cả"
                }
                checked={allFilteredSelected}
                onChange={toggleSelectAllFiltered}
              />
              {selectedIds.size > 0 && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={deleting}
                  onClick={deleteSelected}
                >
                  {deleting
                    ? "Đang xóa..."
                    : `Xóa đã chọn (${selectedIds.size})`}
                </Button>
              )}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-slate-500">Đang tải...</p>
          ) : !selectedCategoryId ? (
            <p className="text-sm text-slate-500">Chọn một danh mục.</p>
          ) : questions.length === 0 ? (
            <p className="text-sm text-slate-500">
              Chưa có câu hỏi trong danh mục này.
            </p>
          ) : filteredQuestions.length === 0 ? (
            <p className="text-sm text-slate-500">
              Không tìm thấy câu hỏi phù hợp với &quot;{searchQuery}&quot;.
            </p>
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {filteredQuestions.map((q) => {
                const checked = selectedIds.has(q.id);
                return (
                  <div
                    key={q.id}
                    className={cn(
                      "flex gap-3 rounded-xl border p-3 text-sm transition",
                      checked
                        ? "border-portal-primary/40 bg-blue-50/40"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={checked}
                        onChange={() => toggleQuestion(q.id)}
                        aria-label={`Chọn câu hỏi ${q.name || q.content.slice(0, 40)}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">
                        {q.name || q.content.slice(0, 120)}
                      </p>
                      {q.name && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {q.content}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        Trắc nghiệm · {q.points} điểm
                        {q.options.filter((o) => o.isCorrect).length > 1 &&
                          " · Nhiều đáp án đúng"}
                      </p>
                      <div className="mt-2 flex gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewQuestion({
                              name: q.name,
                              content: q.content,
                              points: q.points,
                              options: q.options,
                            })
                          }
                          className="text-slate-600 hover:underline"
                        >
                          Xem trước
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(q);
                            setShowQuestionModal(true);
                          }}
                          className="text-portal-primary hover:underline"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteQuestion(q.id)}
                          className="text-red-600 hover:underline"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {searchQuery && filteredQuestions.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              Hiển thị {filteredQuestions.length}/{questions.length} câu hỏi
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
