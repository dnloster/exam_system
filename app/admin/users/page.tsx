"use client";

import { FormEvent, useEffect, useState } from "react";
import PortalLayout from "@/components/portal/PortalLayout";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Label from "@/components/ui/Label";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";

type User = {
  id: number;
  username: string;
  fullName: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  isActive: boolean;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    role: "STUDENT" as User["role"],
  });
  const [error, setError] = useState("");

  async function loadUsers() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Lỗi tạo tài khoản");
      return;
    }
    setForm({ username: "", password: "", fullName: "", role: "STUDENT" });
    await loadUsers();
  }

  return (
    <PortalLayout>
      <div className="page-shell">
        <PageHeader
          title="Quản lý người dùng"
          description="Tạo và quản lý tài khoản hệ thống"
        />

        <Card padding={false} className="mb-8">
          <CardHeader>
            <h2 className="font-semibold text-slate-900">Tạo tài khoản mới</h2>
          </CardHeader>
          <CardBody>
            <form
              onSubmit={handleCreate}
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <div>
                <Label>Kí danh</Label>
                <Input
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label>Mật khẩu</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label>Họ và tên</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label>Vai trò</Label>
                <Select
                  value={form.role}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      role: e.target.value as User["role"],
                    })
                  }
                >
                  <option value="STUDENT">Sinh viên</option>
                  <option value="TEACHER">Giáo viên</option>
                  <option value="ADMIN">Quản trị</option>
                </Select>
              </div>
              {error && (
                <div className="md:col-span-2">
                  <Alert variant="error">{error}</Alert>
                </div>
              )}
              <div className="md:col-span-2">
                <Button type="submit">Tạo tài khoản</Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {loading ? (
          <Card>
            <p className="text-slate-500">Đang tải...</p>
          </Card>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kí danh</th>
                  <th>Họ tên</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="font-medium">{user.username}</td>
                    <td>{user.fullName}</td>
                    <td>
                      <Badge variant="primary">{user.role}</Badge>
                    </td>
                    <td>
                      <Badge variant={user.isActive ? "success" : "muted"}>
                        {user.isActive ? "Hoạt động" : "Vô hiệu"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
