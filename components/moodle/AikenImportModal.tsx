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

    const res = await fetch(`/api/quizzes/${quizId}/question-bank/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: preview, categoryId }),
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
      title="Import câu hỏi Aiken (.txt)"
      description={
        categoryName
          ? `Import vào danh mục: ${categoryName}`
          : "Chọn danh mục trước khi import"
      }
      size="xl"
    >
      <div className="space-y-4 text-sm">
        <p className="text-slate-600">
          Định dạng Aiken: nội dung câu hỏi, các lựa chọn <code>A.</code>{" "}
          <code>B.</code> …, dòng <code>ANSWER:</code>. Hỗ trợ nhiều đáp án:{" "}
          <code>ANSWER: A,D</code> — điểm được chia đều (50% + 50%). Mỗi câu
          cách nhau bằng dòng trống.
        </p>

        <pre className="overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
{`Đâu là các chuẩn kết nối ổ đĩa với bo mạch chủ?
A. IDE
B. NTFS
C. FAT32
D. SATA
ANSWER: A,D`}
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
            accept=".txt,text/plain"
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
            Chọn file .txt
          </Button>
          <a href="/samples/aiken-sample.txt" download>
            <Button type="button" variant="ghost" size="sm">
              Tải file mẫu
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
          placeholder="Dán nội dung file Aiken hoặc chọn file .txt..."
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
