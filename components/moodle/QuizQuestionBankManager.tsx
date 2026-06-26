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
import type { QuestionFormData } from "@/lib/question-payload";
import { dbToFormData } from "@/lib/question-payload";
import { getQuestionTypeLabel } from "@/lib/question-types";
import type { PreviewQuestion } from "@/components/quiz/QuestionPreview";

import Select from "@/components/ui/Select";
import {
  buildCategoryTree,
  getDescendantIds,
  type CategoryTreeNode,
} from "@/lib/category-tree";

type Category = {
  id: number;
  name: string;
  parentId: number | null;
  parent?: { id: number; name: string } | null;
  _count: { questions: number; children?: number };
};

type Question = {
  id: number;
  name: string | null;
  content: string;
  points: number;
  type: string;
  configJson?: unknown;
  questionCategory: { id: number; name: string } | null;
  options: {
    id: number;
    text: string;
    isCorrect: boolean;
    gradePercent?: number;
    sortOrder?: number;
    optionRole?: string;
    groupKey?: string | null;
    matchTarget?: string | null;
  }[];
};

type QuizQuestionBankManagerProps = {
  quizId: number;
};

function questionToFormData(
  q: Question,
  categoryName?: string
): Partial<QuestionFormData> {
  return {
    ...dbToFormData(q),
    name: q.name ?? undefined,
    points: q.points,
    category: q.questionCategory?.name ?? categoryName,
  };
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
  const [newCategoryParentId, setNewCategoryParentId] = useState<string>("");
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
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null
  );
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryParentId, setEditingCategoryParentId] =
    useState<string>("");
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  const categoryTree = useMemo(
    () => buildCategoryTree(categories),
    [categories]
  );

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
      setSelectedCategoryId((prev) => {
        if (prev && cats.some((c) => c.id === prev)) return prev;
        return cats.length > 0 ? cats[0].id : null;
      });
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
    setCategoryError("");
    setCategoryBusy(true);
    const res = await fetch(`/api/quizzes/${quizId}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newCategoryName.trim(),
        parentId: newCategoryParentId ? Number(newCategoryParentId) : null,
      }),
    });
    setCategoryBusy(false);
    if (res.ok) {
      setNewCategoryName("");
      setNewCategoryParentId("");
      await loadCategories();
    } else {
      const data = await res.json();
      setCategoryError(data.error ?? "Không thể thêm danh mục");
    }
  }

  function startEditCategory(cat: CategoryTreeNode) {
    setCategoryError("");
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
    setEditingCategoryParentId(
      cat.parentId != null ? String(cat.parentId) : ""
    );
  }

  function cancelEditCategory() {
    setEditingCategoryId(null);
    setEditingCategoryName("");
    setEditingCategoryParentId("");
  }

  async function saveCategoryEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCategoryId || !editingCategoryName.trim()) return;
    setCategoryError("");
    setCategoryBusy(true);
    const res = await fetch(
      `/api/quizzes/${quizId}/categories/${editingCategoryId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingCategoryName.trim(),
          parentId: editingCategoryParentId
            ? Number(editingCategoryParentId)
            : null,
        }),
      }
    );
    setCategoryBusy(false);
    if (res.ok) {
      cancelEditCategory();
      await loadCategories();
    } else {
      const data = await res.json();
      setCategoryError(data.error ?? "Không thể đổi tên danh mục");
    }
  }

  async function deleteCategory(cat: CategoryTreeNode) {
    if ((cat._count.children ?? 0) > 0) {
      setCategoryError(
        `Danh mục "${cat.name}" còn ${cat._count.children} danh mục con. Hãy xóa hoặc chuyển trước.`
      );
      return;
    }
    if (cat._count.questions > 0) {
      setCategoryError(
        `Danh mục "${cat.name}" còn ${cat._count.questions} câu hỏi. Hãy xóa hoặc chuyển câu hỏi trước.`
      );
      return;
    }
    if (!confirm(`Xóa danh mục "${cat.name}"?`)) return;
    setCategoryError("");
    setCategoryBusy(true);
    const res = await fetch(
      `/api/quizzes/${quizId}/categories/${cat.id}`,
      { method: "DELETE" }
    );
    setCategoryBusy(false);
    if (res.ok) {
      if (editingCategoryId === cat.id) cancelEditCategory();
      await loadCategories();
    } else {
      const data = await res.json();
      setCategoryError(data.error ?? "Không thể xóa danh mục");
    }
  }

  async function saveQuestion(data: QuestionFormData) {
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

  const categoryNames = categoryTree.map((c) => c.path);
  const selectedCategory = categoryTree.find((c) => c.id === selectedCategoryId);

  function CategoryParentSelect({
    value,
    onChange,
    excludeIds,
    disabled,
  }: {
    value: string;
    onChange: (v: string) => void;
    excludeIds?: Set<number>;
    disabled?: boolean;
  }) {
    const options = categoryTree.filter(
      (c) => !excludeIds?.has(c.id)
    );
    return (
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="min-w-[140px]"
      >
        <option value="">— Danh mục gốc —</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {"— ".repeat(c.depth)}
            {c.name}
          </option>
        ))}
      </Select>
    );
  }

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
        categoryName={selectedCategory?.path ?? selectedCategory?.name}
        categories={categoryNames}
        initial={
          editing
            ? questionToFormData(editing, selectedCategory?.path)
            : { category: selectedCategory?.path ?? selectedCategory?.name, type: "MULTIPLE_CHOICE" }
        }
        onSubmit={saveQuestion}
      />

      <AikenImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        quizId={quizId}
        categoryId={selectedCategoryId}
        categoryName={selectedCategory?.path ?? selectedCategory?.name}
        onImported={async () => {
          await loadCategories();
          if (selectedCategoryId) await loadQuestions(selectedCategoryId);
        }}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold text-slate-900">Danh mục câu hỏi</h3>
          <ul className="mb-4 max-h-80 space-y-1 overflow-y-auto">
            {categoryTree.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              const isEditing = editingCategoryId === cat.id;

              if (isEditing) {
                return (
                  <li key={cat.id}>
                    <form
                      onSubmit={saveCategoryEdit}
                      className="space-y-2 rounded-xl border border-portal-primary/30 bg-blue-50/40 p-2"
                    >
                      <Input
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        placeholder="Tên danh mục"
                        autoFocus
                        disabled={categoryBusy}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-500">Danh mục cha:</span>
                        <CategoryParentSelect
                          value={editingCategoryParentId}
                          onChange={setEditingCategoryParentId}
                          excludeIds={getDescendantIds(cat.id, categories)}
                          disabled={categoryBusy}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={categoryBusy}>
                          Lưu
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={cancelEditCategory}
                          disabled={categoryBusy}
                        >
                          Hủy
                        </Button>
                      </div>
                    </form>
                  </li>
                );
              }

              return (
                <li key={cat.id}>
                  <div
                    className={cn(
                      "flex items-center gap-1 rounded-xl transition",
                      isSelected ? "bg-portal-primary shadow-sm" : "hover:bg-slate-100"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={cn(
                        "min-w-0 flex-1 rounded-xl py-2 text-left text-sm transition",
                        isSelected ? "text-white" : "text-slate-700"
                      )}
                      style={{ paddingLeft: `${12 + cat.depth * 16}px`, paddingRight: "12px" }}
                    >
                      {cat.depth > 0 && (
                        <span className="mr-1 opacity-50">↳</span>
                      )}
                      {cat.name}{" "}
                      <span className="opacity-80">
                        ({cat._count.questions}
                        {(cat._count.children ?? 0) > 0 &&
                          ` · ${cat._count.children} con`}
                        )
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditCategory(cat)}
                      className={cn(
                        "rounded-lg px-2 py-1 text-xs hover:underline",
                        isSelected
                          ? "text-white/90 hover:text-white"
                          : "text-portal-primary"
                      )}
                      title="Sửa danh mục"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCategory(cat)}
                      disabled={categoryBusy}
                      className={cn(
                        "rounded-lg px-2 py-1 text-xs hover:underline disabled:opacity-50",
                        isSelected ? "text-white/90 hover:text-white" : "text-red-600"
                      )}
                      title="Xóa danh mục"
                    >
                      Xóa
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {categoryError && (
            <p className="mb-3 text-sm text-red-600">{categoryError}</p>
          )}
          <form onSubmit={createCategory} className="space-y-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Tên danh mục mới"
              disabled={categoryBusy}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Danh mục cha:</span>
              <CategoryParentSelect
                value={newCategoryParentId}
                onChange={setNewCategoryParentId}
                disabled={categoryBusy}
              />
              <Button type="submit" size="sm" disabled={categoryBusy}>
                Thêm
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-900">
              Câu hỏi trong danh mục
              {selectedCategory && `: ${selectedCategory.path}`}
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
                Nhập file
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
                        {getQuestionTypeLabel(q.type)} · {q.points} điểm
                      </p>
                      <div className="mt-2 flex gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewQuestion({
                              type: q.type,
                              name: q.name,
                              content: q.content,
                              points: q.points,
                              configJson: q.configJson,
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
