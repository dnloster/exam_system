"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import MoodleFieldset from "./MoodleFieldset";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Label from "@/components/ui/Label";
import Checkbox from "@/components/ui/Checkbox";
import Alert from "@/components/ui/Alert";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { QUESTION_TYPES, type QuestionTypeValue } from "@/lib/question-types";
import type { QuestionFormData } from "@/lib/question-payload";
import { parseBlankIds } from "@/lib/question-payload";
import { redistributeGrades, type EditorOption } from "@/lib/question-options";
import ChoiceOptionContent from "@/components/quiz/ChoiceOptionContent";

type UnifiedQuestionEditorProps = {
  title?: string;
  initial?: Partial<QuestionFormData>;
  categories?: string[];
  onSubmit: (data: QuestionFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  continueLabel?: string;
  embedded?: boolean;
  allowTypeChange?: boolean;
  /** Ẩn nhập điểm — điểm được tính tự động theo đề thi (tổng 10). */
  hidePoints?: boolean;
};

const defaultChoiceOptions = (): EditorOption[] => [
  { text: "", gradePercent: 100, mediaType: "TEXT" },
  { text: "", gradePercent: 0, mediaType: "TEXT" },
  { text: "", gradePercent: 0, mediaType: "TEXT" },
  { text: "", gradePercent: 0, mediaType: "TEXT" },
];

export default function UnifiedQuestionEditor({
  title = "Tạo câu hỏi",
  initial,
  categories = [],
  onSubmit,
  onCancel,
  submitLabel = "Lưu thay đổi",
  continueLabel = "Lưu và tiếp tục chỉnh sửa",
  embedded = false,
  allowTypeChange = true,
  hidePoints = false,
}: UnifiedQuestionEditorProps) {
  const [type, setType] = useState<QuestionTypeValue>(
    initial?.type ?? "MULTIPLE_CHOICE"
  );
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
  const [options, setOptions] = useState<EditorOption[]>(
    initial?.options?.length ? initial.options : defaultChoiceOptions()
  );
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [matchPairs, setMatchPairs] = useState(
    initial?.matchPairs ?? [
      { prompt: "", answer: "" },
      { prompt: "", answer: "" },
    ]
  );
  const [blankAnswers, setBlankAnswers] = useState<Record<string, string[]>>(
    initial?.blankAnswers ?? { "1": [""] }
  );
  const [fillBlankCaseSensitive, setFillBlankCaseSensitive] = useState(
    initial?.fillBlankCaseSensitive ?? false
  );
  const [orderItems, setOrderItems] = useState(
    initial?.orderItems ?? ["", ""]
  );
  const [dragItems, setDragItems] = useState(initial?.dragItems ?? [""]);
  const [dropZones, setDropZones] = useState(
    initial?.dropZones ?? [{ label: "", correctItemIndex: 0 }]
  );
  const [matrixColumns, setMatrixColumns] = useState(
    initial?.matrixColumns ?? ["Có", "Không"]
  );
  const [matrixRows, setMatrixRows] = useState(
    initial?.matrixRows ?? [{ text: "", correctColumnIndex: 0 }]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const blankIds = useMemo(() => parseBlankIds(content), [content]);

  useEffect(() => {
    if (type !== "FILL_IN_BLANK") return;
    setBlankAnswers((prev) => {
      const next: Record<string, string[]> = {};
      const ids = blankIds.length > 0 ? blankIds : ["1"];
      for (const id of ids) {
        next[id] = prev[id]?.length ? prev[id] : [""];
      }
      return next;
    });
  }, [type, blankIds]);

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

  function setOptionMediaType(index: number, mediaType: "TEXT" | "IMAGE") {
    setOptions((prev) =>
      prev.map((o, i) =>
        i === index
          ? {
              ...o,
              mediaType,
              imageUrl: mediaType === "IMAGE" ? o.imageUrl : undefined,
            }
          : o
      )
    );
  }

  async function uploadOptionImage(index: number, file: File) {
    setUploadingIndex(index);
    setError("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload/option-image", {
      method: "POST",
      body: form,
    });
    setUploadingIndex(null);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Không thể tải ảnh lên");
      return;
    }
    const { url } = await res.json();
    setOptions((prev) =>
      prev.map((o, i) =>
        i === index
          ? {
              ...o,
              mediaType: "IMAGE",
              imageUrl: url,
              text: o.text || "Hình ảnh",
            }
          : o
      )
    );
  }

  function buildPayload(): QuestionFormData {
    const base = {
      type,
      name: name || undefined,
      content,
      category: category || undefined,
      points: hidePoints ? 1 : points,
      generalFeedback: generalFeedback || undefined,
      shuffleAnswers,
    };

    switch (type) {
      case "MULTIPLE_CHOICE":
      case "MULTIPLE_RESPONSE":
        return { ...base, type, options };
      case "MATCHING":
        return { ...base, type, matchPairs };
      case "FILL_IN_BLANK":
        return {
          ...base,
          type,
          blankAnswers,
          fillBlankCaseSensitive,
        };
      case "ORDERING":
        return { ...base, type, orderItems };
      case "DRAG_AND_DROP":
        return { ...base, type, dragItems, dropZones };
      case "MATRIX":
        return { ...base, type, matrixColumns, matrixRows };
      default:
        return { ...base, type: "MULTIPLE_CHOICE", options };
    }
  }

  async function save(continueEditing: boolean) {
    setError("");
    setLoading(true);
    try {
      await onSubmit(buildPayload());
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

  const typeFields = (
    <>
      {allowTypeChange && (
        <div className="mb-4">
          <Label>Loại câu hỏi</Label>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as QuestionTypeValue)}
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
      )}

      {(type === "MULTIPLE_CHOICE" || type === "MULTIPLE_RESPONSE") && (
        <MoodleFieldset title="Câu trả lời">
          <p className="text-sm text-slate-500">
            Mỗi lựa chọn có thể là <strong>văn bản</strong> hoặc{" "}
            <strong>hình ảnh</strong> (URL hoặc tải file). Đánh dấu đáp án đúng
            — hệ thống chia đều tổng <strong>100%</strong>
            {correctCount > 1 &&
              ` (${correctCount} × ${(100 / correctCount).toFixed(1)}%)`}
            .
          </p>
          <div className="table-wrap !shadow-none">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  <th className="w-28">Loại</th>
                  <th>Lựa chọn</th>
                  <th className="w-24">Đúng</th>
                  <th className="w-20">Điểm</th>
                  <th className="w-14" />
                </tr>
              </thead>
              <tbody>
                {options.map((opt, index) => {
                  const isImage = (opt.mediaType ?? "TEXT") === "IMAGE";
                  return (
                    <tr key={index}>
                      <td className="text-center text-slate-400">{index + 1}</td>
                      <td>
                        <Select
                          value={opt.mediaType ?? "TEXT"}
                          onChange={(e) =>
                            setOptionMediaType(
                              index,
                              e.target.value as "TEXT" | "IMAGE"
                            )
                          }
                          style={{
                            paddingLeft:0,
                            paddingRight:0,
                          }}
                          
                        >
                          <option value="TEXT">Văn bản</option>
                          <option value="IMAGE">Hình ảnh</option>
                        </Select>
                      </td>
                      <td>
                        <div className="space-y-2">
                          {isImage ? (
                            <>
                              <Input
                                value={opt.imageUrl ?? ""}
                                onChange={(e) =>
                                  setOptions((prev) =>
                                    prev.map((o, i) =>
                                      i === index
                                        ? { ...o, imageUrl: e.target.value }
                                        : o
                                    )
                                  )
                                }
                                placeholder="URL hình ảnh (https://... hoặc /uploads/...)"
                                required={isImage}
                              />
                              <div className="flex flex-wrap items-center gap-2">
                                <label className="cursor-pointer text-sm text-portal-primary hover:underline">
                                  {uploadingIndex === index
                                    ? "Đang tải..."
                                    : "Tải ảnh lên"}
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/gif,image/webp"
                                    className="hidden"
                                    disabled={uploadingIndex === index}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) uploadOptionImage(index, file);
                                    }}
                                  />
                                </label>
                                <Input
                                  value={opt.text}
                                  onChange={(e) =>
                                    setOptions((prev) =>
                                      prev.map((o, i) =>
                                        i === index
                                          ? { ...o, text: e.target.value }
                                          : o
                                      )
                                    )
                                  }
                                  placeholder="Nhãn / mô tả (tùy chọn)"
                                />
                              </div>
                              {opt.imageUrl && (
                                <ChoiceOptionContent
                                  text={opt.text}
                                  mediaType="IMAGE"
                                  imageUrl={opt.imageUrl}
                                  imageClassName="max-h-24"
                                />
                              )}
                            </>
                          ) : (
                            <Input
                              value={opt.text}
                              onChange={(e) =>
                                setOptions((prev) =>
                                  prev.map((o, i) =>
                                    i === index
                                      ? { ...o, text: e.target.value }
                                      : o
                                  )
                                )
                              }
                              required
                            />
                          )}
                        </div>
                      </td>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={opt.gradePercent > 0}
                          onChange={(e) => toggleCorrect(index, e.target.checked)}
                        />
                      </td>
                      <td className="text-center text-sm">
                        {opt.gradePercent > 0
                          ? `${opt.gradePercent % 1 === 0 ? opt.gradePercent : opt.gradePercent.toFixed(1)}%`
                          : "—"}
                      </td>
                      <td>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={options.length <= 2}
                          onClick={() =>
                            setOptions((prev) => {
                              const remaining = prev.filter((_, i) => i !== index);
                              const idx = remaining
                                .map((o, i) => (o.gradePercent > 0 ? i : -1))
                                .filter((i) => i >= 0);
                              return redistributeGrades(remaining, idx);
                            })
                          }
                        >
                          ✕
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={options.length >= 10}
            onClick={() =>
              setOptions((prev) => [
                ...prev,
                { text: "", gradePercent: 0, mediaType: "TEXT" },
              ])
            }
          >
            + Thêm lựa chọn
          </Button>
          {Math.abs(gradeSum - 100) > 0.01 && (
            <p className="text-sm text-amber-700">
              Tổng điểm: {gradeSum.toFixed(1)}% — cần 100%.
            </p>
          )}
        </MoodleFieldset>
      )}

      {type === "MATCHING" && (
        <MoodleFieldset title="Cặp ghép đôi">
          <p className="mb-3 text-sm text-slate-500">
            Mỗi dòng là một cặp: mục bên trái ghép với đáp án bên phải.
          </p>
          {matchPairs.map((pair, index) => (
            <div key={index} className="mb-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                value={pair.prompt}
                placeholder={`Mục ${index + 1}`}
                onChange={(e) =>
                  setMatchPairs((prev) =>
                    prev.map((p, i) =>
                      i === index ? { ...p, prompt: e.target.value } : p
                    )
                  )
                }
              />
              <Input
                value={pair.answer}
                placeholder={`Đáp án ${index + 1}`}
                onChange={(e) =>
                  setMatchPairs((prev) =>
                    prev.map((p, i) =>
                      i === index ? { ...p, answer: e.target.value } : p
                    )
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={matchPairs.length <= 2}
                onClick={() =>
                  setMatchPairs((prev) => prev.filter((_, i) => i !== index))
                }
              >
                ✕
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setMatchPairs((prev) => [...prev, { prompt: "", answer: "" }])
            }
          >
            + Thêm cặp
          </Button>
        </MoodleFieldset>
      )}

      {type === "FILL_IN_BLANK" && (
        <MoodleFieldset title="Đáp án điền khuyết">
          <p className="mb-3 text-sm text-slate-500">
            Dùng <code>{"{{1}}"}</code>, <code>{"{{2}}"}</code> trong nội dung
            để đánh dấu ô trống. Mỗi ô có thể có nhiều đáp án chấp nhận (cách
            nhau bằng dấu phẩy).
          </p>
          <Checkbox
            label="Phân biệt hoa thường"
            checked={fillBlankCaseSensitive}
            onChange={(e) => setFillBlankCaseSensitive(e.target.checked)}
          />
          <div className="mt-3 space-y-2">
            {(blankIds.length > 0 ? blankIds : ["1"]).map((blankId) => (
              <div key={blankId}>
                <Label>Đáp án cho ô {`{{${blankId}}}`}</Label>
                <Input
                  value={(blankAnswers[blankId] ?? [""]).join(", ")}
                  placeholder="Hà Nội, Ha Noi"
                  onChange={(e) =>
                    setBlankAnswers((prev) => ({
                      ...prev,
                      [blankId]: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </MoodleFieldset>
      )}

      {type === "ORDERING" && (
        <MoodleFieldset title="Thứ tự đúng (từ trên xuống)">
          {orderItems.map((item, index) => (
            <div key={index} className="mb-2 flex gap-2">
              <span className="pt-2 text-sm text-slate-400">{index + 1}.</span>
              <Input
                className="flex-1"
                value={item}
                onChange={(e) =>
                  setOrderItems((prev) =>
                    prev.map((v, i) => (i === index ? e.target.value : v))
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={orderItems.length <= 2}
                onClick={() =>
                  setOrderItems((prev) => prev.filter((_, i) => i !== index))
                }
              >
                ✕
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOrderItems((prev) => [...prev, ""])}
          >
            + Thêm mục
          </Button>
        </MoodleFieldset>
      )}

      {type === "DRAG_AND_DROP" && (
        <>
          <MoodleFieldset title="Mục kéo">
            {dragItems.map((item, index) => (
              <div key={index} className="mb-2 flex gap-2">
                <Input
                  className="flex-1"
                  value={item}
                  placeholder={`Mục ${index + 1}`}
                  onChange={(e) =>
                    setDragItems((prev) =>
                      prev.map((v, i) => (i === index ? e.target.value : v))
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={dragItems.length <= 1}
                  onClick={() =>
                    setDragItems((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDragItems((prev) => [...prev, ""])}
            >
              + Thêm mục kéo
            </Button>
          </MoodleFieldset>
          <MoodleFieldset title="Vùng thả">
            {dropZones.map((zone, index) => (
              <div
                key={index}
                className="mb-2 grid gap-2 sm:grid-cols-[1fr_160px_auto]"
              >
                <Input
                  value={zone.label}
                  placeholder={`Vùng ${index + 1}`}
                  onChange={(e) =>
                    setDropZones((prev) =>
                      prev.map((z, i) =>
                        i === index ? { ...z, label: e.target.value } : z
                      )
                    )
                  }
                />
                <Select
                  value={zone.correctItemIndex}
                  onChange={(e) =>
                    setDropZones((prev) =>
                      prev.map((z, i) =>
                        i === index
                          ? { ...z, correctItemIndex: Number(e.target.value) }
                          : z
                      )
                    )
                  }
                >
                  {dragItems.map((item, i) => (
                    <option key={i} value={i}>
                      {item || `Mục ${i + 1}`}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={dropZones.length <= 1}
                  onClick={() =>
                    setDropZones((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setDropZones((prev) => [
                  ...prev,
                  { label: "", correctItemIndex: 0 },
                ])
              }
            >
              + Thêm vùng thả
            </Button>
          </MoodleFieldset>
        </>
      )}

      {type === "MATRIX" && (
        <>
          <MoodleFieldset title="Cột đáp án chung">
            {matrixColumns.map((col, index) => (
              <div key={index} className="mb-2 flex gap-2">
                <Input
                  className="flex-1"
                  value={col}
                  placeholder={`Cột ${index + 1}`}
                  onChange={(e) =>
                    setMatrixColumns((prev) =>
                      prev.map((v, i) => (i === index ? e.target.value : v))
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={matrixColumns.length <= 2}
                  onClick={() =>
                    setMatrixColumns((prev) =>
                      prev.filter((_, i) => i !== index)
                    )
                  }
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMatrixColumns((prev) => [...prev, ""])}
            >
              + Thêm cột
            </Button>
          </MoodleFieldset>
          <MoodleFieldset title="Các dòng câu hỏi">
            {matrixRows.map((row, index) => (
              <div
                key={index}
                className="mb-2 grid gap-2 sm:grid-cols-[1fr_160px_auto]"
              >
                <Input
                  value={row.text}
                  placeholder={`Dòng ${index + 1}`}
                  onChange={(e) =>
                    setMatrixRows((prev) =>
                      prev.map((r, i) =>
                        i === index ? { ...r, text: e.target.value } : r
                      )
                    )
                  }
                />
                <Select
                  value={row.correctColumnIndex}
                  onChange={(e) =>
                    setMatrixRows((prev) =>
                      prev.map((r, i) =>
                        i === index
                          ? { ...r, correctColumnIndex: Number(e.target.value) }
                          : r
                      )
                    )
                  }
                >
                  {matrixColumns.map((col, i) => (
                    <option key={i} value={i}>
                      {col || `Cột ${i + 1}`}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={matrixRows.length <= 1}
                  onClick={() =>
                    setMatrixRows((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setMatrixRows((prev) => [
                  ...prev,
                  { text: "", correctColumnIndex: 0 },
                ])
              }
            >
              + Thêm dòng
            </Button>
          </MoodleFieldset>
        </>
      )}
    </>
  );

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
            <Input value={name} onChange={(e) => setName(e.target.value)} />
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
          {!hidePoints && (
            <div>
              <Label>Điểm</Label>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="max-w-[140px]"
              />
            </div>
          )}
          {(type === "MULTIPLE_CHOICE" ||
            type === "MULTIPLE_RESPONSE" ||
            type === "MATCHING" ||
            type === "ORDERING") && (
            <div className="flex items-end pb-1">
              <Checkbox
                label="Xáo trộn các lựa chọn"
                checked={shuffleAnswers}
                onChange={(e) => setShuffleAnswers(e.target.checked)}
              />
            </div>
          )}
        </div>
        <div>
          <Label>Phản hồi chung</Label>
          <Textarea
            value={generalFeedback}
            onChange={(e) => setGeneralFeedback(e.target.value)}
            rows={2}
          />
        </div>
      </MoodleFieldset>

      {typeFields}

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

  if (embedded) return <div className="space-y-4">{formBody}</div>;

  return (
    <Card padding={false} className="overflow-hidden">
      <CardHeader>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </CardHeader>
      <CardBody className="space-y-4">{formBody}</CardBody>
    </Card>
  );
}
