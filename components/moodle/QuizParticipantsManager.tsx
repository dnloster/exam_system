"use client";

import { useEffect, useState } from "react";

type Participant = {
  id: number;
  userId: number;
  addedAt: string;
  user: {
    id: number;
    username: string;
    fullName: string;
    isActive: boolean;
    courseEnrollments?: {
      course: { id: number; code: string; name: string };
    }[];
  };
};

type Student = {
  id: number;
  username: string;
  fullName: string;
};

type Course = {
  id: number;
  name: string;
  code: string;
  _count: { enrollments: number };
};

type QuizParticipantsManagerProps = {
  quizId: number;
};

export default function QuizParticipantsManager({
  quizId,
}: QuizParticipantsManagerProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "">("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"student" | "class">("student");
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

  async function loadStudents() {
    const res = await fetch("/api/users/students");
    if (res.ok) setStudents(await res.json());
  }

  async function loadCourses() {
    const res = await fetch("/api/courses");
    if (res.ok) setCourses(await res.json());
  }

  useEffect(() => {
    loadParticipants();
    loadQuizStatus();
    loadStudents();
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  const enrolledIds = new Set(participants.map((p) => p.userId));
  const availableStudents = students.filter((s) => {
    if (enrolledIds.has(s.id)) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q)
    );
  });

  async function enrolSelected() {
    setSaving(true);
    setMessage("");
    const res = await fetch(`/api/quizzes/${quizId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: selectedIds }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setSelectedIds([]);
      setShowEnrol(false);
      if (data.isPublished) setIsPublished(true);
      setMessage(
        `Đã ghi danh ${data.enrolledCount ?? selectedIds.length} sinh viên.` +
          (data.isPublished ? " Bài kiểm tra đã được xuất bản cho sinh viên." : "")
      );
    } else {
      setMessage(data.error ?? "Ghi danh thất bại");
    }
    await loadParticipants();
  }

  async function enrolByClass() {
    if (!selectedCourseId) return;
    setSaving(true);
    setMessage("");
    const res = await fetch(`/api/quizzes/${quizId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: selectedCourseId }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      if (data.isPublished) setIsPublished(true);
      setMessage(
        `Đã ghi danh ${data.enrolledCount} sinh viên từ lớp đã chọn.` +
          (data.isPublished ? " Bài kiểm tra đã được xuất bản cho sinh viên." : "")
      );
      setShowEnrol(false);
    } else {
      setMessage(data.error ?? "Ghi danh theo lớp thất bại");
    }
    await loadParticipants();
  }

  async function removeParticipant(userId: number) {
    if (!confirm("Gỡ sinh viên khỏi bài kiểm tra?")) return;
    await fetch(`/api/quizzes/${quizId}/participants?userId=${userId}`, {
      method: "DELETE",
    });
    await loadParticipants();
  }

  async function removeByClass() {
    if (!selectedCourseId) return;
    const course = courses.find((c) => c.id === selectedCourseId);
    if (
      !confirm(
        `Gỡ tất cả sinh viên thuộc lớp "${course?.name}" khỏi bài kiểm tra?`
      )
    ) {
      return;
    }
    await fetch(
      `/api/quizzes/${quizId}/participants?courseId=${selectedCourseId}`,
      { method: "DELETE" }
    );
    setMessage(`Đã gỡ sinh viên lớp ${course?.code}.`);
    await loadParticipants();
  }

  function userClasses(p: Participant) {
    const classes = p.user.courseEnrollments?.map((e) => e.course.code) ?? [];
    return classes.length ? classes.join(", ") : "—";
  }

  return (
    <div>
      <div className="mb-4 rounded border border-gray-300 bg-[#f8f9fa] p-4 text-sm">
        <p className="mt-2">
          Đã ghi danh: <strong>{participants.length}</strong>
        </p>
      </div>

      {!isPublished && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Bài kiểm tra chưa xuất bản.</strong> Sinh viên đã ghi danh sẽ
          không thấy bài này cho đến khi bạn bật &quot;Hiển thị cho sinh viên&quot;
          ở tab Cài đặt, hoặc ghi danh thêm sinh viên để hệ thống tự xuất bản.
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
          onClick={() => {
            setMode("student");
            setShowEnrol(true);
          }}
          className="rounded bg-[#0f6cbf] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d5aa7]"
        >
          Ghi danh sinh viên
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("class");
            setShowEnrol(true);
          }}
          className="rounded border border-[#0f6cbf] bg-white px-4 py-2 text-sm font-medium text-[#0f6cbf] hover:bg-blue-50"
        >
          Ghi danh theo lớp
        </button>
      </div>

      {showEnrol && mode === "student" && (
        <div className="mb-6 rounded border border-gray-300 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Chọn sinh viên</h3>
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
            placeholder="Tìm theo tên hoặc kí danh..."
            className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="max-h-64 space-y-1 overflow-y-auto rounded border p-2">
            {availableStudents.length === 0 ? (
              <p className="p-2 text-sm text-gray-500">
                Không còn sinh viên khả dụng.
              </p>
            ) : (
              availableStudents.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(s.id)}
                    onChange={(e) =>
                      setSelectedIds((prev) =>
                        e.target.checked
                          ? [...prev, s.id]
                          : prev.filter((id) => id !== s.id)
                      )
                    }
                  />
                  <span className="text-sm">
                    {s.fullName}{" "}
                    <span className="text-gray-500">({s.username})</span>
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
              onClick={() => setSelectedIds(availableStudents.map((s) => s.id))}
              className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Chọn tất cả
            </button>
          </div>
        </div>
      )}

      {showEnrol && mode === "class" && (
        <div className="mb-6 rounded border border-gray-300 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Ghi danh theo lớp</h3>
            <button
              type="button"
              onClick={() => setShowEnrol(false)}
              className="text-sm text-gray-500 hover:underline"
            >
              Đóng
            </button>
          </div>
          <p className="mb-3 text-sm text-gray-600">
            Chọn lớp để ghi danh tất cả sinh viên thuộc lớp đó vào bài kiểm tra.
          </p>
          <select
            value={selectedCourseId}
            onChange={(e) =>
              setSelectedCourseId(e.target.value ? Number(e.target.value) : "")
            }
            className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">— Chọn lớp —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code}) — {c._count.enrollments} sinh viên
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || !selectedCourseId}
              onClick={enrolByClass}
              className="rounded bg-[#0f6cbf] px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Ghi danh cả lớp
            </button>
            <button
              type="button"
              disabled={!selectedCourseId || participants.length === 0}
              onClick={removeByClass}
              className="rounded border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Gỡ ghi danh theo lớp
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
                <th className="border border-gray-300 px-3 py-2">Lớp</th>
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
                    Chưa ghi danh sinh viên nào — bài kiểm tra chưa mở cho ai.
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
                      {userClasses(p)}
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
