"use client";

import { useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import Alert from "@/components/ui/Alert";

type AikenImportModalProps = {
  open: boolean;
  onClose: () => void;
  quizId: number;
  categoryId: number | null;
  categoryName?: string;
  onImported: () => Promise<void>;
};

export default function AikenImportModal({
  open,
  onClose,
  quizId,
  categoryId,
  categoryName,
  onImported,
}: AikenImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    total: number;
    errors: string[];
  } | null>(null);

  function handleClose() {
    if (loading) return;
    setPreview("");
    setResult(null);
    onClose();
  }

  async function handleFile(file: File) {
    const text = await file.text();
    setPreview(text);
    setResult(null);
  }

  async function handleImport() {
    if (!preview.trim() || !categoryId) return;
    setLoading(true);
    setResult(null);

    const format = preview.trim().startsWith("{") ? "json" : "aiken";

    const res = await fetch(`/api/quizzes/${quizId}/question-bank/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: preview, categoryId, format }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setResult({
        imported: data.imported ?? 0,
        total: 0,
        errors: data.errors ?? [data.error ?? "Import thất bại"],
      });
      return;
    }

    setResult(data);
    await onImported();

    if ((data.imported ?? 0) > 0) {
      setTimeout(() => handleClose(), 1200);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import câu hỏi trắc nghiệm"
      description={
        categoryName
          ? `Import vào danh mục: ${categoryName}`
          : "Chọn danh mục trước khi import"
      }
      size="xl"
    >
      <div className="space-y-4 text-sm">
        <p className="text-slate-600">
          Hỗ trợ <strong>Aiken (.txt)</strong> và <strong>JSON (.json)</strong>{" "}
          cho câu hỏi một/nhiều đáp án, kể cả đáp án hình ảnh.
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <p className="mb-2 font-medium">Aiken — đáp án hình ảnh:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <code>[IMAGE]https://example.com/a.png</code>
            </li>
            <li>
              URL trực tiếp: <code>https://.../logo.png</code>
            </li>
            <li>
              Markdown: <code>![mô tả](https://.../b.png)</code>
            </li>
          </ul>
          <p className="mt-2 mb-1 font-medium">JSON — mỗi option:</p>
          <pre className="overflow-x-auto text-[11px]">{`{ "mediaType": "IMAGE", "imageUrl": "https://...", "text": "Nhãn", "correct": true }`}</pre>
        </div>

        <pre className="overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
{`Đâu là các chuẩn kết nối ổ đĩa?
A. IDE
B. SATA
C. [IMAGE]https://example.com/diagram.png
ANSWER: A,B`}
        </pre>

        {!categoryId && (
          <Alert variant="warning">
            Vui lòng chọn danh mục câu hỏi trước khi import.
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.json,text/plain,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            Chọn file .txt / .json
          </Button>
          <a href="/samples/aiken-images-sample.txt" download>
            <Button type="button" variant="ghost" size="sm">
              Mẫu Aiken (ảnh)
            </Button>
          </a>
          <a href="/samples/questions-import.json" download>
            <Button type="button" variant="ghost" size="sm">
              Mẫu JSON (ảnh)
            </Button>
          </a>
        </div>

        <Textarea
          value={preview}
          onChange={(e) => {
            setPreview(e.target.value);
            setResult(null);
          }}
          rows={10}
          placeholder="Dán nội dung Aiken hoặc JSON, hoặc chọn file..."
          className="font-mono text-xs"
        />

        {result && (
          <Alert variant={result.imported > 0 ? "success" : "error"}>
            <p>
              Đã import <strong>{result.imported}</strong>
              {result.total ? ` / ${result.total}` : ""} câu hỏi.
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-xs">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </Alert>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            type="button"
            disabled={loading || !preview.trim() || !categoryId}
            onClick={handleImport}
          >
            {loading ? "Đang import..." : "Import vào ngân hàng"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
