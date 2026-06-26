import { Role } from "@prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Quản trị hệ thống",
  UNIT_COMMANDER: "Chỉ huy đơn vị",
  UNIT_MEMBER: "Thành viên đơn vị",
};

export function isUnitCommander(role: Role) {
  return role === "UNIT_COMMANDER";
}

export function isUnitMember(role: Role) {
  return role === "UNIT_MEMBER";
}

export function isCommanderOrAdmin(role: Role) {
  return role === "ADMIN" || role === "UNIT_COMMANDER";
}
