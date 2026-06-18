"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PortalLayout from "@/components/portal/PortalLayout";

type Course = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  quizzes: { id: number; title: string }[];
};

export default function ClassroomsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/courses")
      .then(async (res) => {
        if (res.ok) return res.json();
        return [];
      })
      .then(setCourses)
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortalLayout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-portal-primary">Lớp học</h1>

        {loading ? (
          <p>Đang tải...</p>
        ) : courses.length === 0 ? (
          <p className="text-gray-600">Chưa có lớp học nào.</p>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="rounded border border-gray-300 bg-white p-4 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-portal-primary">
                  {course.name}
                </h2>
                <p className="text-sm text-gray-500">Mã lớp: {course.code}</p>
                {course.description && (
                  <p className="mt-2 text-sm text-gray-600">{course.description}</p>
                )}
                {course.quizzes.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium">Bài kiểm tra:</p>
                    <ul className="mt-1 list-inside list-disc text-sm text-portal-primary">
                      {course.quizzes.map((q) => (
                        <li key={q.id}>
                          <Link href={`/quizzes/${q.id}`} className="hover:underline">
                            {q.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
