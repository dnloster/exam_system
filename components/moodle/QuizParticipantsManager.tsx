"use client";

import { useEffect, useState } from "react";
import { ROLE_LABELS } from "@/lib/roles";
import { unitKindLabel, type UnitKind } from "@/lib/units";
import { confirmAction } from "@/lib/swal";

type Participant = {
  id: number;
  userId: number;
  addedAt: string;
  user: {
    id: number;
    username: string;
    fullName: string;
    isActive: boolean;
    unit?: { id: number; name: string } | null;
  };
};

type Enrollee = {
  id: number;
  username: string;
  fullName: string;
  role: "UNIT_MEMBER" | "UNIT_COMMANDER";
  unit: { id: number; name: string; unitKind: UnitKind } | null;
  courseEnrollments: { course: { id: number; code: string; name: string } }[];
};

type Course = {
  id: number;
  name: string;
  code: string;
  _count: { enrollments: number };
};

type Capabilities = {
  unitKind: UnitKind | null;
  canEnrollCourseStudents: boolean;
  canEnrollAllEligible: boolean;
};

type QuizParticipantsManagerProps = {
  quizId: number;
};

function enrolleeLabel(e: Enrollee): string {
  const parts = [ROLE_LABELS[e.role]];
  if (e.unit) parts.push(e.unit.name);
  if (e.courseEnrollments.length > 0) {
    parts.push(
      `Lớp: ${e.courseEnrollments.map((c) => c.course.code).join(", ")}`
    );
  }
  return parts.join(" · ");
}

export default function QuizParticipantsManager({
  quizId,
}: QuizParticipantsManagerProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [enrollees, setEnrollees] = useState<Enrollee[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "">("");
  const [search, setSearch] = useState("");
  const [showEnrol, setShowEnrol] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  async function loadParticipants() {
    const res = await fetch(`/api/quizzes/${quizId}/participants`);
    if (res.ok) setParticipants(await res.json());
    setLoading(false);
  }

  async function loadQuizStatus() {
    const res = await fetch(`/api/quizzes/${quizId}`);
    if (res.ok) {
      const quiz = await res.json();
      setIsPublished(Boolean(quiz.isPublished));
    }
  }

  async function loadEnrollees() {
    const res = await fetch(`/api/quizzes/${quizId}/enrollees`);
    if (res.ok) {
      const data = await res.json();
      setEnrollees(data.enrollees ?? []);
      setCourses(data.courses ?? []);
      setCapabilities(data.capabilities ?? null);
    }
  }

  useEffect(() => {
    loadParticipants();
    loadQuizStatus();
    loadEnrollees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  const enrolledIds = new Set(participants.map((p) => p.userId));
  const availableEnrollees = enrollees.filter((e) => {
    if (enrolledIds.has(e.id)) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.username.toLowerCase().includes(q) ||
      (e.unit?.name.toLowerCase().includes(q) ?? false)
    );
  });

  async function postEnrollment(body: Record<string, unknown>) {
    setSaving(true);
    setMessage("");
    const res = await fetch(`/api/quizzes/${quizId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setSelectedIds([]);
      setShowEnrol(false);
      if (data.isPublished) setIsPublished(true);
      setMessage(
        `Đã ghi danh ${data.enrolledCount} người.` +
          (data.isPublished ? " Bài kiểm tra đã được xuất bản." : "")
      );
      await loadEnrollees();
    } else {
      setMessage(data.error ?? "Ghi danh thất bại");
    }
    await loadParticipants();
  }

  async function enrolSelected() {
    await postEnrollment({ userIds: selectedIds });
  }

  async function enrolAllUnitMembers() {
    const ok = await confirmAction({
      text: "Ghi danh tất cả thành viên trong đơn vị của bạn?",
      confirmText: "Ghi danh",
    });
    if (!ok) return;
    await postEnrollment({ enrollAllUnitMembers: true });
  }

  async function enrolAllCourseStudents() {
    const ok = await confirmAction({
      text: "Ghi danh mọi sinh viên đã có trong các lớp?",
      confirmText: "Ghi danh",
    });
    if (!ok) return;
    await postEnrollment({ enrollAllCourseStudents: true });
  }

  async function enrolAllEligible() {
    const ok = await confirmAction({
      text: "Ghi danh tất cả đối tượng hợp lệ theo quyền phòng/ban?",
      confirmText: "Ghi danh",
    });
    if (!ok) return;
    await postEnrollment({ enrollAllEligible: true });
  }

  async function enrolByCourse() {
    if (!selectedCourseId) return;
    const course = courses.find((c) => c.id === selectedCourseId);
    const ok = await confirmAction({
      text: `Ghi danh sinh viên lớp "${course?.name}"?`,
      confirmText: "Ghi danh",
    });
    if (!ok) return;
    await postEnrollment({ courseId: selectedCourseId });
  }

  async function removeParticipant(userId: number) {
    const ok = await confirmAction({
      text: "Gỡ người này khỏi bài kiểm tra?",
      confirmText: "Gỡ",
      icon: "warning",
    });
    if (!ok) return;
    await fetch(`/api/quizzes/${quizId}/participants?userId=${userId}`, {
      method: "DELETE",
    });
    await loadParticipants();
  }

  const unitKindHint =
    capabilities?.unitKind != null
      ? unitKindLabel(capabilities.unitKind)
      : null;

  return (
    <div>
      <div className="mb-4 rounded border border-gray-300 bg-[#f8f9fa] p-4 text-sm">
        <p className="mt-2">
          Đã ghi danh: <strong>{participants.length}</strong>
        </p>
        {unitKindHint && (
          <p className="mt-2 text-gray-600">
            Quyền ghi danh theo <strong>{unitKindHint}</strong>:
            {capabilities?.unitKind === "KHOA"
              ? " thành viên khoa + sinh viên các lớp."
              : " thành viên phòng/ban (trừ chỉ huy phòng khác) + mọi người thuộc khoa + sinh viên các lớp."}
          </p>
        )}
      </div>

      {!isPublished && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Bài kiểm tra chưa xuất bản.</strong> Người đã ghi danh sẽ không
          thấy bài cho đến khi bạn bật xuất bản ở tab Cài đặt.
        </div>
      )}

      {message && (
        <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {message}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowEnrol(true)}
          className="rounded bg-[#0f6cbf] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d5aa7]"
        >
          Ghi danh thủ công
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={enrolAllUnitMembers}
          className="rounded border border-[#0f6cbf] bg-white px-4 py-2 text-sm font-medium text-[#0f6cbf] hover:bg-blue-50 disabled:opacity-50"
        >
          Ghi danh toàn đơn vị
        </button>
        {capabilities?.canEnrollCourseStudents && (
          <button
            type="button"
            disabled={saving}
            onClick={enrolAllCourseStudents}
            className="rounded border border-[#0f6cbf] bg-white px-4 py-2 text-sm font-medium text-[#0f6cbf] hover:bg-blue-50 disabled:opacity-50"
          >
            Ghi danh sinh viên các lớp
          </button>
        )}
        {capabilities?.canEnrollAllEligible && (
          <button
            type="button"
            disabled={saving}
            onClick={enrolAllEligible}
            className="rounded border border-[#0f6cbf] bg-white px-4 py-2 text-sm font-medium text-[#0f6cbf] hover:bg-blue-50 disabled:opacity-50"
          >
            Ghi danh tất cả đối tượng hợp lệ
          </button>
        )}
      </div>

      {capabilities?.canEnrollCourseStudents && courses.length > 0 && (
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded border border-gray-200 bg-white p-4">
          <div className="min-w-[240px] flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Ghi danh theo lớp
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) =>
                setSelectedCourseId(
                  e.target.value ? Number(e.target.value) : ""
                )
              }
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">— Chọn lớp —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code}) — {c._count.enrollments} SV
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={saving || !selectedCourseId}
            onClick={enrolByCourse}
            className="rounded bg-[#0f6cbf] px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Ghi danh lớp
          </button>
        </div>
      )}

      {showEnrol && (
        <div className="mb-6 rounded border border-gray-300 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Chọn người ghi danh</h3>
            <button
              type="button"
              onClick={() => setShowEnrol(false)}
              className="text-sm text-gray-500 hover:underline"
            >
              Đóng
            </button>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, kí danh hoặc đơn vị..."
            className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="max-h-72 space-y-1 overflow-y-auto rounded border p-2">
            {availableEnrollees.length === 0 ? (
              <p className="p-2 text-sm text-gray-500">
                Không còn đối tượng khả dụng.
              </p>
            ) : (
              availableEnrollees.map((e) => (
                <label
                  key={e.id}
                  className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selectedIds.includes(e.id)}
                    onChange={(ev) =>
                      setSelectedIds((prev) =>
                        ev.target.checked
                          ? [...prev, e.id]
                          : prev.filter((id) => id !== e.id)
                      )
                    }
                  />
                  <span className="text-sm">
                    <span className="font-medium">{e.fullName}</span>{" "}
                    <span className="text-gray-500">({e.username})</span>
                    <span className="mt-0.5 block text-xs text-gray-500">
                      {enrolleeLabel(e)}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={saving || selectedIds.length === 0}
              onClick={enrolSelected}
              className="rounded bg-[#0f6cbf] px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Ghi danh {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedIds(availableEnrollees.map((e) => e.id))
              }
              className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Chọn tất cả
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-300">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#e9ecef] text-left">
                <th className="border border-gray-300 px-3 py-2">Họ tên</th>
                <th className="border border-gray-300 px-3 py-2">Kí danh</th>
                <th className="border border-gray-300 px-3 py-2">Đơn vị</th>
                <th className="border border-gray-300 px-3 py-2 w-32">
                  Ngày ghi danh
                </th>
                <th className="border border-gray-300 px-3 py-2 w-28">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {participants.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="border border-gray-300 px-4 py-8 text-center text-gray-500"
                  >
                    Chưa ghi danh ai.
                  </td>
                </tr>
              ) : (
                participants.map((p) => (
                  <tr key={p.id} className="bg-white hover:bg-[#f8f9fa]">
                    <td className="border border-gray-300 px-3 py-2">
                      {p.user.fullName}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {p.user.username}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {p.user.unit?.name ?? "—"}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {new Date(p.addedAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeParticipant(p.userId)}
                        className="text-red-600 hover:underline"
                      >
                        Gỡ
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
