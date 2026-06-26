import Link from "next/link";
import LoginWidget from "./LoginWidget";

export default function NewsForumSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-10">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="card-header">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-portal-primary">
              Tin tức
            </h2>
          </div>
          <div className="card-body space-y-3 text-sm">
            <p className="text-slate-600">
              Chào mừng đến với hệ thống lớp học trực tuyến TCKT TT.
            </p>
            <ul className="space-y-2">
              <li>
                <Link href="/quizzes" className="link-primary">
                  → Danh sách bài kiểm tra trắc nghiệm
                </Link>
              </li>
              <li>
                <Link href="/classrooms" className="link-primary">
                  → Xem danh sách lớp học
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <LoginWidget />
      </div>
    </section>
  );
}
