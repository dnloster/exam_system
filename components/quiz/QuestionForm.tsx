"use client";

import { FormEvent, useState } from "react";

type Option = { text: string; isCorrect: boolean };

type QuestionFormProps = {
  initial?: {
    id?: number;
    content: string;
    category?: string;
    points: number;
    options: Option[];
  };
  onSubmit: (data: {
    content: string;
    category?: string;
    points: number;
    options: Option[];
  }) => Promise<void>;
  onCancel?: () => void;
};

const emptyOptions = (): Option[] => [
  { text: "", isCorrect: true },
  { text: "", isCorrect: false },
  { text: "", isCorrect: false },
  { text: "", isCorrect: false },
];

export default function QuestionForm({
  initial,
  onSubmit,
  onCancel,
}: QuestionFormProps) {
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [points, setPoints] = useState(initial?.points ?? 1);
  const [options, setOptions] = useState<Option[]>(
    initial?.options ?? emptyOptions()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setCorrect(index: number) {
    setOptions((prev) =>
      prev.map((opt, i) => ({ ...opt, isCorrect: i === index }))
    );
  }

  function updateOption(index: number, text: string) {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, text } : opt))
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSubmit({ content, category: category || undefined, points, options });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded border bg-white p-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Nội dung câu hỏi</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
          rows={3}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Chuyên mục</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Điểm</label>
          <input
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">4 đáp án (chọn 1 đáp án đúng)</label>
        <div className="space-y-2">
          {options.map((opt, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct"
                checked={opt.isCorrect}
                onChange={() => setCorrect(index)}
              />
              <input
                value={opt.text}
                onChange={(e) => updateOption(index, e.target.value)}
                className="flex-1 rounded border px-3 py-2 text-sm"
                placeholder={`Đáp án ${String.fromCharCode(65 + index)}`}
                required
              />
            </div>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-portal-primary px-4 py-2 text-sm text-white hover:bg-portal-primary-dark disabled:opacity-50"
        >
          {loading ? "Đang lưu..." : "Lưu câu hỏi"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Hủy
          </button>
        )}
      </div>
    </form>
  );
}
