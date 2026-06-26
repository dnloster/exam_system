import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";

export default function DocumentsPage() {
  return (
    <PortalLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <div className="rounded border border-gray-300 bg-white p-12 shadow-sm">
          <div className="text-6xl">📚</div>
          <h1 className="mt-4 text-2xl font-bold text-portal-primary">
            Tài liệu, Bài giảng
          </h1>
          <p className="mt-4 text-gray-600">
            Module thư viện tài liệu và bài giảng đang được phát triển.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded bg-portal-primary px-4 py-2 text-white hover:bg-portal-primary-dark"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </PortalLayout>
  );
}
