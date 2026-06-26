"use client";

import { FormEvent } from "react";
import MoodleFieldset from "./MoodleFieldset";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Label from "@/components/ui/Label";
import Checkbox from "@/components/ui/Checkbox";

export type QuizSettingsData = {
  title: string;
  description?: string;
  openAt?: string;
  closeAt?: string;
  timeLimitMinutes?: number | null;
  shuffleQuestions: boolean;
  questionsPerPage: number;
  attemptsAllowed: number;
  passingScore: number;
  isPublished: boolean;
  hasAccessPassword?: boolean;
  accessPassword?: string;
  removeAccessPassword?: boolean;
};

type QuizSettingsFormProps = {
  initial: QuizSettingsData;
  onSubmit: (data: QuizSettingsData) => Promise<void>;
  submitLabel?: string;
};

function toDatetimeLocal(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

export default function QuizSettingsForm({
  initial,
  onSubmit,
  submitLabel = "Lưu và hiển thị",
}: QuizSettingsFormProps) {
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    await onSubmit({
      title: String(form.get("title")),
      description: String(form.get("description") || "") || undefined,
      openAt: String(form.get("openAt") || "") || undefined,
      closeAt: String(form.get("closeAt") || "") || undefined,
      timeLimitMinutes: form.get("timeLimitMinutes")
        ? Number(form.get("timeLimitMinutes"))
        : null,
      shuffleQuestions: form.get("shuffleQuestions") === "on",
      questionsPerPage: Number(form.get("questionsPerPage") || 0),
      attemptsAllowed: Number(form.get("attemptsAllowed") || 1),
      passingScore: Number(form.get("passingScore") || 50),
      isPublished: form.get("isPublished") === "on",
      accessPassword: String(form.get("accessPassword") || "") || undefined,
      removeAccessPassword: form.get("removeAccessPassword") === "on",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <MoodleFieldset title="Thông tin chung">
        <div>
          <Label>Tên bài kiểm tra</Label>
          <Input name="title" defaultValue={initial.title} required />
        </div>
        <div>
          <Label>Mô tả</Label>
          <Textarea
            name="description"
            defaultValue={initial.description ?? ""}
            rows={4}
          />
        </div>
      </MoodleFieldset>

      <MoodleFieldset title="Thời gian">
        <div className="form-grid-2">
          <div>
            <Label>Mở bài kiểm tra</Label>
            <Input
              name="openAt"
              type="datetime-local"
              defaultValue={toDatetimeLocal(initial.openAt)}
            />
          </div>
          <div>
            <Label>Đóng bài kiểm tra</Label>
            <Input
              name="closeAt"
              type="datetime-local"
              defaultValue={toDatetimeLocal(initial.closeAt)}
            />
          </div>
        </div>
        <div>
          <Label>Giới hạn thời gian (phút)</Label>
          <Input
            name="timeLimitMinutes"
            type="number"
            min={1}
            defaultValue={initial.timeLimitMinutes ?? ""}
            className="max-w-[180px]"
            placeholder="Không giới hạn"
          />
        </div>
      </MoodleFieldset>

      <MoodleFieldset title="Điểm">
        <div className="form-grid-2">
          <div>
            <Label>Điểm đạt (% tổng điểm)</Label>
            <Input
              name="passingScore"
              type="number"
              min={0}
              max={100}
              defaultValue={initial.passingScore}
              className="max-w-[180px]"
            />
          </div>
          <div>
            <Label>Số lần làm bài cho phép</Label>
            <Input
              name="attemptsAllowed"
              type="number"
              min={1}
              defaultValue={initial.attemptsAllowed}
              className="max-w-[180px]"
            />
          </div>
        </div>
      </MoodleFieldset>

      <MoodleFieldset title="Bố cục & hiển thị">
        <div className="form-grid-2">
          <div>
            <Label>Số câu hỏi mỗi trang</Label>
            <Select
              name="questionsPerPage"
              defaultValue={String(initial.questionsPerPage)}
            >
              <option value={0}>Tất cả trên một trang</option>
              <option value={1}>1</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </Select>
          </div>
          <div className="flex flex-col justify-end gap-3 pb-1">
            <Checkbox
              name="shuffleQuestions"
              label="Xáo trộn câu hỏi"
              defaultChecked={initial.shuffleQuestions}
            />
            <Checkbox
              name="isPublished"
              label="Hiển thị cho sinh viên"
              defaultChecked={initial.isPublished}
            />
          </div>
        </div>
      </MoodleFieldset>

      <MoodleFieldset title="Mật khẩu vào thi">
        <div className="space-y-3">
          <div>
            <Label>Mật khẩu vào thi</Label>
            <Input
              name="accessPassword"
              type="password"
              autoComplete="new-password"
              placeholder={
                initial.hasAccessPassword
                  ? "Nhập mật khẩu mới để đổi"
                  : "Để trống nếu không yêu cầu mật khẩu"
              }
              className="max-w-md"
            />
            <p className="mt-1 text-xs text-slate-500">
              {initial.hasAccessPassword
                ? "Bài kiểm tra đang có mật khẩu. Để trống khi lưu để giữ nguyên, hoặc tick bỏ mật khẩu bên dưới."
                : "Thí sinh phải nhập mật khẩu này trước khi bắt đầu làm bài."}
            </p>
          </div>
          {initial.hasAccessPassword && (
            <Checkbox
              name="removeAccessPassword"
              label="Bỏ mật khẩu vào thi"
            />
          )}
        </div>
      </MoodleFieldset>

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
