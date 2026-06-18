"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import PortalLayout from "@/components/portal/PortalLayout";
import SearchBar from "@/components/portal/SearchBar";

type SearchResult = {
  quizzes: {
    id: number;
    title: string;
    description: string | null;
    passingScore: number;
    timeLimitMinutes: number | null;
  }[];
  courses: {
    id: number;
    name: string;
    code: string;
    description: string | null;
  }[];
};

export default function SearchPageContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then(async (res) => res.json())
      .then(setResults)
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <PortalLayout>
      <div className="border-b bg-gray-50">
        <SearchBar />
      </div>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-4 text-xl font-bold text-portal-primary">
          Kết quả tìm kiếm{q ? `: "${q}"` : ""}
        </h1>

        {loading ? (
          <p>Đang tìm...</p>
        ) : (
          <>
            <section className="mb-8">
              <h2 className="mb-3 font-semibold">Bài kiểm tra</h2>
              {results?.quizzes.length ? (
                <div className="space-y-2">
                  {results.quizzes.map((quiz) => (
                    <Link
                      key={quiz.id}
                      href={`/quizzes/${quiz.id}`}
                      className="block rounded border bg-white p-3 hover:border-portal-primary"
                    >
                      <p className="font-medium text-portal-primary">{quiz.title}</p>
                      {quiz.description && (
                        <p className="text-sm text-gray-600">{quiz.description}</p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Không tìm thấy bài kiểm tra.</p>
              )}
            </section>

            <section>
              <h2 className="mb-3 font-semibold">Lớp học</h2>
              {results?.courses.length ? (
                <div className="space-y-2">
                  {results.courses.map((course) => (
                    <Link
                      key={course.id}
                      href="/classrooms"
                      className="block rounded border bg-white p-3 hover:border-portal-primary"
                    >
                      <p className="font-medium text-portal-primary">{course.name}</p>
                      <p className="text-sm text-gray-500">{course.code}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Không tìm thấy lớp học.</p>
              )}
            </section>
          </>
        )}
      </div>
    </PortalLayout>
  );
}
