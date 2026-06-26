"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import QuizSettingsForm, {
  QuizSettingsData,
} from "@/components/moodle/QuizSettingsForm";
import Select from "@/components/ui/Select";
import Label from "@/components/ui/Label";
import Alert from "@/components/ui/Alert";

type Unit = {
  id: number;
  name: string;
};

export default function NewQuizPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitId, setUnitId] = useState("");
  const [error, setError] = useState("");

  const isAdmin = session?.user.role === "ADMIN";
  const commanderUnitName = session?.user.unitName;

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/units")
        .then(async (res) => (res.ok ? res.json() : []))
        .then(setUnits);
    }
  }, [isAdmin]);

  async function handleCreate(data: QuizSettingsData) {
    setError("");

    if (isAdmin && !unitId) {
      setError("Vui lòng chọn đơn vị cho bài kiểm tra test");
      return;
    }

    const payload = {
      ...data,
      openAt: data.openAt ? new Date(data.openAt).toISOString() : null,
      closeAt: data.closeAt ? new Date(data.closeAt).toISOString() : null,
      ...(isAdmin ? { unitId: Number(unitId) } : {}),
    };

    const res = await fetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Không thể tạo bài kiểm tra");
    }

    const quiz = await res.json();
    router.push(`/teacher/quizzes/${quiz.id}/questions`);
  }

  return (
    <PortalLayout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href="/teacher/quizzes"
          className="text-sm text-portal-primary hover:underline"
        >
          ← Danh sách bài kiểm tra
        </Link>
        <h1 className="mt-4 mb-2 text-2xl font-bold text-portal-primary">
          Thêm bài kiểm tra mới
        </h1>

        {isAdmin && (
          <div className="mb-6">
            <Label>Đơn vị *</Label>
            <Select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              required
            >
              <option value="">-- Chọn đơn vị --</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {error && (
          <div className="mb-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        <QuizSettingsForm
          initial={{
            title: "",
            description: "",
            shuffleQuestions: false,
            questionsPerPage: 0,
            attemptsAllowed: 1,
            passingScore: 50,
            isPublished: false,
          }}
          onSubmit={handleCreate}
          submitLabel="Lưu và chỉnh sửa câu hỏi"
        />
      </div>
    </PortalLayout>
  );
}
