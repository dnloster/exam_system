"use client";

import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getPostLoginPath } from "@/lib/navigation";
import { Role } from "@prisma/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Alert from "@/components/ui/Alert";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";

export default function LoginWidget() {
  const { data: session } = useSession();
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

  if (session?.user) {
    return (
      <Card padding={false}>
        <CardHeader>
          <p className="text-sm font-semibold text-slate-900">Đã đăng nhập</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="font-medium text-slate-900">{session.user.fullName}</p>
          <p className="text-sm text-slate-500">Kí danh: {session.user.username}</p>
          <Link href={getPostLoginPath(session.user.role)}>
            <Button className="w-full">Vào bài kiểm tra</Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card padding={false}>
      <CardHeader>
        <p className="text-sm font-semibold text-slate-900">Đăng nhập nhanh</p>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Kí danh</Label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Kí danh"
            />
          </div>
          <div>
            <Label>Mật khẩu</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
            />
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
          <Link
            href="/login"
            className="block text-center text-xs text-portal-primary hover:underline"
          >
            Trang đăng nhập đầy đủ
          </Link>
        </form>
      </CardBody>
    </Card>
  );
}
