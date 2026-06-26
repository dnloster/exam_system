"use client";

import { FormEvent, useState } from "react";
import MoodleFieldset from "./MoodleFieldset";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Label from "@/components/ui/Label";
import Checkbox from "@/components/ui/Checkbox";
import Alert from "@/components/ui/Alert";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { redistributeGrades } from "@/lib/question-options";

export type MoodleQuestionData = {
  name?: string;
  content: string;
  category?: string;
  points: number;
  generalFeedback?: string;
  shuffleAnswers: boolean;
  options: { text: string; gradePercent: number }[];
};

type MoodleQuestionEditorProps = {
  title?: string;
  initial?: Partial<MoodleQuestionData>;
  categories?: string[];
  onSubmit: (data: MoodleQuestionData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  continueLabel?: string;
  /** Bỏ Card/header — dùng bên trong Modal */
  embedded?: boolean;
};

const defaultOptions = () => [
  { text: "", gradePercent: 100 },
  { text: "", gradePercent: 0 },
  { text: "", gradePercent: 0 },
  { text: "", gradePercent: 0 },
];

export default function MoodleQuestionEditor({
  title = "Trắc nghiệm một lựa chọn",
  initial,
  categories = [],
  onSubmit,
  onCancel,
  submitLabel = "Lưu thay đổi",
  continueLabel = "Lưu và tiếp tục chỉnh sửa",
  embedded = false,
}: MoodleQuestionEditorProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Mặc định");
  const [points, setPoints] = useState(initial?.points ?? 1);
  const [generalFeedback, setGeneralFeedback] = useState(
    initial?.generalFeedback ?? ""
  );
  const [shuffleAnswers, setShuffleAnswers] = useState(
    initial?.shuffleAnswers ?? false
  );
  const [options, setOptions] = useState(
    initial?.options?.length ? initial.options : defaultOptions()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const correctCount = options.filter((o) => o.gradePercent > 0).length;
  const gradeSum = options.reduce((s, o) => s + o.gradePercent, 0);

  function toggleCorrect(index: number, correct: boolean) {
    setOptions((prev) => {
      const correctIndices = prev
        .map((opt, i) => (opt.gradePercent > 0 ? i : -1))
        .filter((i) => i >= 0);

      const nextIndices = correct
        ? Array.from(new Set([...correctIndices, index]))
        : correctIndices.filter((i) => i !== index);

      return redistributeGrades(prev, nextIndices);
    });
  }

  function updateOptionText(index: number, text: string) {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, text } : opt))
    );
  }

  function addChoice() {
    if (options.length >= 10) return;
    setOptions((prev) => [...prev, { text: "", gradePercent: 0 }]);
  }

  function removeChoice(index: number) {
    if (options.length <= 2) return;
    setOptions((prev) => {
      const remaining = prev.filter((_, i) => i !== index);
      const correctIndices = remaining
        .map((opt, i) => (opt.gradePercent > 0 ? i : -1))
        .filter((i) => i >= 0);
      return redistributeGrades(remaining, correctIndices);
    });
  }

  async function save(continueEditing: boolean) {
    setError("");
    setLoading(true);
    try {
      await onSubmit({
        name: name || undefined,
        content,
        category: category || undefined,
        points,
        generalFeedback: generalFeedback || undefined,
        shuffleAnswers,
        options,
      });
      if (!continueEditing && onCancel) onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent, continueEditing = false) {
    e.preventDefault();
    save(continueEditing);
  }

  const formBody = (
    <>
      <MoodleFieldset title="Thông tin chung">
          <div className="form-grid-2">
            <div>
              <Label>Danh mục câu hỏi</Label>
              <Input
                list="question-categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <datalist id="question-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <Label>Tên câu hỏi</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tên định danh (tùy chọn)"
              />
            </div>
          </div>
          <div>
            <Label>Nội dung câu hỏi</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              required
            />
          </div>
          <div className="form-grid-2">
            <div>
              <Label>Điểm mặc định</Label>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="max-w-[140px]"
              />
            </div>
            <div className="flex items-end pb-1">
              <Checkbox
                label="Xáo trộn các lựa chọn"
                checked={shuffleAnswers}
                onChange={(e) => setShuffleAnswers(e.target.checked)}
              />
            </div>
          </div>
          <div>
            <Label>Phản hồi chung</Label>
            <Textarea
              value={generalFeedback}
              onChange={(e) => setGeneralFeedback(e.target.value)}
              rows={2}
              placeholder="Hiển thị sau khi nộp bài (tùy chọn)"
            />
          </div>
        </MoodleFieldset>

        <MoodleFieldset title="Câu trả lời">
          <p className="text-sm text-slate-500">
            Đánh dấu các đáp án đúng — hệ thống tự chia đều tổng{" "}
            <strong>100%</strong>
            {correctCount > 1 &&
              ` (hiện tại: ${correctCount} đáp án × ${(100 / correctCount).toFixed(1)}%)`}
            .
          </p>
          <div className="table-wrap !shadow-none">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  <th>Lựa chọn</th>
                  <th className="w-24">Đúng</th>
                  <th className="w-20">Điểm</th>
                  <th className="w-14" />
                </tr>
              </thead>
              <tbody>
                {options.map((opt, index) => (
                  <tr key={index}>
                    <td className="text-center text-slate-400">{index + 1}</td>
                    <td>
                      <Input
                        value={opt.text}
                        onChange={(e) => updateOptionText(index, e.target.value)}
                        placeholder={`Lựa chọn ${index + 1}`}
                        required
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={opt.gradePercent > 0}
                        onChange={(e) => toggleCorrect(index, e.target.checked)}
                        aria-label={`Đáp án ${index + 1} đúng`}
                      />
                    </td>
                    <td className="text-center text-sm text-slate-600">
                      {opt.gradePercent > 0
                        ? `${opt.gradePercent % 1 === 0 ? opt.gradePercent : opt.gradePercent.toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChoice(index)}
                        disabled={options.length <= 2}
                        className="!px-2 text-red-600"
                      >
                        ✕
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={addChoice}>
            + Thêm lựa chọn
          </Button>
          {Math.abs(gradeSum - 100) > 0.01 && (
            <p className="text-sm text-amber-700">
              Tổng điểm hiện tại: {gradeSum.toFixed(1)}% — cần đúng 100%.
            </p>
          )}
        </MoodleFieldset>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <Button
            type="button"
            disabled={loading}
            onClick={(e) => handleSubmit(e, false)}
          >
            {loading ? "Đang lưu..." : submitLabel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={(e) => handleSubmit(e, true)}
          >
            {continueLabel}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Hủy
            </Button>
          )}
        </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{formBody}</div>;
  }

  return (
    <Card padding={false} className="overflow-hidden">
      <CardHeader>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </CardHeader>
      <CardBody className="space-y-4">{formBody}</CardBody>
    </Card>
  );
}
