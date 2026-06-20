"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { buildCategoryTree, type CategoryTreeNode } from "@/lib/category-tree";

type Category = {
  id: number;
  name: string;
  parentId: number | null;
  _count: { questions: number; children?: number };
};

type RandomQuestionModalProps = {
  open: boolean;
  onClose: () => void;
  quizId: number;
  attachedQuestionIds: number[];
  onAdded: () => Promise<void>;
};

function categoryOptionLabel(cat: CategoryTreeNode) {
  const indent = cat.depth > 0 ? `${"—".repeat(cat.depth)} ` : "";
  return `${indent}${cat.name} (${cat._count.questions})`;
}

export default function RandomQuestionModal({
  open,
  onClose,
  quizId,
  attachedQuestionIds,
  onAdded,
}: RandomQuestionModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [includeSubcategories, setIncludeSubcategories] = useState(false);
  const [count, setCount] = useState(1);
  const [poolSize, setPoolSize] = useState<number | null>(null);
  const [loadingPool, setLoadingPool] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const categoryTree = useMemo(
    () => buildCategoryTree(categories),
    [categories]
  );

  async function loadCategories() {
    const res = await fetch(`/api/quizzes/${quizId}/categories`);
    if (!res.ok) return;
    const cats: Category[] = await res.json();
    setCategories(cats);
    setCategoryId((prev) => {
      if (prev && cats.some((c) => c.id === prev)) return prev;
      return cats.length > 0 ? cats[0].id : null;
    });
  }

  async function loadPoolSize(catId: number, includeSubs: boolean) {
    setLoadingPool(true);
    const params = new URLSearchParams({
      quizId: String(quizId),
      categoryId: String(catId),
    });
    if (includeSubs) params.set("includeSubcategories", "true");
    const res = await fetch(`/api/questions?${params}`);
    setLoadingPool(false);
    if (res.ok) {
      const questions: { id: number }[] = await res.json();
      const attached = new Set(attachedQuestionIds);
      setPoolSize(questions.filter((q) => !attached.has(q.id)).length);
    } else {
      setPoolSize(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    setError("");
    setCount(1);
    setIncludeSubcategories(false);
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quizId]);

  useEffect(() => {
    if (!open || !categoryId) {
      setPoolSize(null);
      return;
    }
    loadPoolSize(categoryId, includeSubcategories);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categoryId, includeSubcategories, quizId, attachedQuestionIds]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) return;
    setSubmitting(true);
    setError("");

    const res = await fetch(`/api/quizzes/${quizId}/random-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId,
        count,
        includeSubcategories,
      }),
    });

    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Không thể thêm câu hỏi ngẫu nhiên");
      return;
    }

    await onAdded();
    onClose();
  }

  const selectedCategory = categoryTree.find((c) => c.id === categoryId);
  const maxCount = poolSize ?? 50;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm câu hỏi ngẫu nhiên"
      description="Mỗi slot sẽ rút một câu khác nhau từ danh mục khi học sinh bắt đầu làm bài."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="random-category"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Danh mục câu hỏi
          </label>
          <Select
            id="random-category"
            value={categoryId ?? ""}
            onChange={(e) =>
              setCategoryId(e.target.value ? Number(e.target.value) : null)
            }
            className="w-full border border-gray-300 bg-white px-3 py-2 text-sm"
            required
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

        <div>
          <label
            htmlFor="random-count"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Số câu hỏi ngẫu nhiên
          </label>
          <Input
            id="random-count"
            type="number"
            min={1}
            max={Math.max(1, maxCount)}
            value={count}
            onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
            className="border-gray-300 bg-white text-sm"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            {loadingPool
              ? "Đang kiểm tra ngân hàng câu hỏi..."
              : poolSize != null
                ? `${poolSize} câu khả dụng (đã loại câu cố định trong đề).`
                : "Chọn danh mục để xem số câu khả dụng."}
          </p>
        </div>

        {selectedCategory && (
          <p className="rounded border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            🎲 Mỗi lần làm bài, hệ thống sẽ rút ngẫu nhiên từ{" "}
            <strong>{selectedCategory.path}</strong>
            {includeSubcategories && " (kèm danh mục con)"}. Cùng một câu sẽ
            không xuất hiện hai lần trong một lượt làm bài.
          </p>
        )}

        {error && (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={
              submitting ||
              !categoryId ||
              poolSize === 0 ||
              count > (poolSize ?? 0)
            }
            className="rounded bg-[#0f6cbf] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d5aa7] disabled:opacity-50"
          >
            {submitting ? "Đang thêm..." : "Thêm câu hỏi ngẫu nhiên"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
