"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-center gap-2 px-4 py-4 sm:flex-row sm:justify-center"
    >
      <label className="text-sm text-gray-700">
        Tìm kiếm lớp học, bài giảng, bài tập, tài liệu:
      </label>
      <div className="flex w-full max-w-lg gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-portal-primary focus:outline-none"
        />
        <button
          type="submit"
          className="rounded bg-portal-primary px-4 py-2 text-sm font-medium text-white hover:bg-portal-primary-dark"
        >
          Tìm kiếm
        </button>
      </div>
    </form>
  );
}
