"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import PortalLayout from "@/components/portal/PortalLayout";
import { getPostLoginPath } from "@/lib/navigation";
import { Role } from "@prisma/client";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Alert from "@/components/ui/Alert";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Sai kí danh hoặc mật khẩu");
      return;
    }

    const res = await fetch("/api/auth/session");
    const nextSession = res.ok ? await res.json() : null;
    const role = (nextSession?.user?.role ?? "STUDENT") as Role;
    router.push(getPostLoginPath(role));
    router.refresh();
  }

  return (
    <PortalLayout>
      <div className="page-shell flex min-h-[60vh] items-center justify-center">
        <Card padding={false} className="w-full max-w-md">
          <CardHeader className="text-center">
            <h1 className="text-lg font-bold text-slate-900">Đăng nhập</h1>
            <p className="mt-1 text-sm text-slate-500">
              Hệ thống lớp học trực tuyến
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Kí danh</Label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập kí danh"
                  required
                />
              </div>
              <div>
                <Label>Mật khẩu</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                />
              </div>
              {error && <Alert variant="error">{error}</Alert>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
              <p className="text-center text-xs text-slate-500">
                Tài khoản mẫu: admin/admin123, teacher1/teacher123,
                student1/student123
              </p>
              <Link
                href="/"
                className="block text-center text-sm text-portal-primary hover:underline"
              >
                ← Về trang chủ
              </Link>
            </form>
          </CardBody>
        </Card>
      </div>
    </PortalLayout>
  );
}
