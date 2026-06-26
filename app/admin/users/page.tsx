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
import { ROLE_LABELS } from "@/lib/roles";

type Unit = {
  id: number;
  code: string;
  name: string;
};

type User = {
  id: number;
  username: string;
  fullName: string;
  role: "ADMIN" | "UNIT_COMMANDER" | "UNIT_MEMBER";
  isActive: boolean;
  createdAt: string;
  unitId: number | null;
  unit: Unit | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    role: "UNIT_MEMBER" as User["role"],
    unitId: "" as string | number,
  });
  const [error, setError] = useState("");

  async function loadUsers() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  async function loadUnits() {
    const res = await fetch("/api/units");
    if (res.ok) setUnits(await res.json());
  }

  useEffect(() => {
    loadUsers();
    loadUnits();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        unitId:
          form.role === "ADMIN"
            ? null
            : form.unitId
              ? Number(form.unitId)
              : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Lỗi tạo tài khoản");
      return;
    }
    setForm({
      username: "",
      password: "",
      fullName: "",
      role: "UNIT_MEMBER",
      unitId: "",
    });
    await loadUsers();
  }

  return (
    <PortalLayout>
      <div className="page-shell">
        <PageHeader
          title="Quản lý người dùng"
          description="Tạo tài khoản chỉ huy và thành viên theo từng đơn vị"
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
                      unitId:
                        e.target.value === "ADMIN" ? "" : form.unitId,
                    })
                  }
                >
                  <option value="UNIT_MEMBER">Thành viên đơn vị</option>
                  <option value="UNIT_COMMANDER">Chỉ huy đơn vị</option>
                  <option value="ADMIN">Quản trị hệ thống</option>
                </Select>
              </div>
              {form.role !== "ADMIN" && (
                <div className="md:col-span-2">
                  <Label>Đơn vị</Label>
                  <Select
                    value={form.unitId}
                    onChange={(e) =>
                      setForm({ ...form, unitId: e.target.value })
                    }
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
                  <th>Đơn vị</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="font-medium">{user.username}</td>
                    <td>{user.fullName}</td>
                    <td>{user.unit?.name ?? "—"}</td>
                    <td>
                      <Badge variant="primary">
                        {ROLE_LABELS[user.role]}
                      </Badge>
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
