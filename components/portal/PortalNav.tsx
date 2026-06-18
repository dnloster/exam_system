"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/components/ui/cn";

const navItems = [
  { href: "/", label: "Trang chủ", icon: "🏠" },
  {
    href: "/quizzes",
    label: "Bài tập, Kiểm tra",
    icon: "📝",
    children: [
      { href: "/quizzes", label: "Danh sách bài kiểm tra" },
      { href: "/teacher/quizzes", label: "Quản lý bài kiểm tra" },
    ],
  },
  {
    href: "/classrooms",
    label: "Lớp học",
    icon: "🏫",
    children: [{ href: "/classrooms", label: "Danh sách lớp học" }],
  },
  {
    href: "/documents",
    label: "Tài liệu, Bài giảng",
    icon: "📚",
    children: [{ href: "/documents", label: "Thư viện tài liệu" }],
  },
];

export default function PortalNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="nav-shell sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2">
        <button
          className="rounded-lg p-2 text-white md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          ☰
        </button>

        <ul
          className={cn(
            "md:flex md:flex-row md:items-center md:gap-1",
            mobileOpen
              ? "absolute left-0 right-0 top-full flex flex-col gap-1 border-t border-white/10 bg-portal-primary-dark p-3 shadow-lg md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none"
              : "hidden"
          )}
        >
          {navItems.map((item) => (
            <li
              key={item.href}
              className="relative"
              onMouseEnter={() => setOpenMenu(item.label)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <Link
                href={item.href}
                className={cn(
                  "nav-link",
                  pathname === item.href && "nav-link-active"
                )}
                onClick={() => setMobileOpen(false)}
              >
                <span>{item.icon}</span>
                {item.label}
                {item.children && (
                  <span className="text-[10px] opacity-70">▼</span>
                )}
              </Link>
              {item.children && openMenu === item.label && (
                <ul className="absolute left-0 top-full z-30 hidden min-w-[240px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-elevated md:block">
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        className="block px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-portal-primary"
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 py-1 text-sm text-white">
          {session?.user ? (
            <>
              <span className="hidden max-w-[160px] truncate rounded-full bg-white/10 px-3 py-1 sm:inline">
                {session.user.fullName}
              </span>
              {session.user.role === "ADMIN" && (
                <Link
                  href="/admin/users"
                  className="rounded-lg px-2 py-1 hover:bg-white/10"
                >
                  Quản trị
                </Link>
              )}
              {(session.user.role === "TEACHER" ||
                session.user.role === "ADMIN") && (
                <Link
                  href="/teacher/quizzes"
                  className="rounded-lg px-2 py-1 hover:bg-white/10"
                >
                  Giáo viên
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-lg px-2 py-1 hover:bg-white/10"
              >
                Thoát
              </button>
            </>
          ) : (
            <Link href="/login" className="btn btn-sm bg-white/15 text-white hover:bg-white/25">
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
