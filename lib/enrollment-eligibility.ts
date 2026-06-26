import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth-helpers";
import type { UnitKind } from "@/lib/units";

const enrolleeSelect = {
  id: true,
  username: true,
  fullName: true,
  role: true,
  isActive: true,
  unit: { select: { id: true, name: true, unitKind: true } },
  courseEnrollments: {
    select: {
      course: { select: { id: true, code: true, name: true } },
    },
  },
} as const;

export type EnrolleeUser = Prisma.UserGetPayload<{
  select: typeof enrolleeSelect;
}>;

async function getUnitIdsByKind(kind: UnitKind) {
  const units = await prisma.unit.findMany({
    where: { unitKind: kind },
    select: { id: true },
  });
  return units.map((u) => u.id);
}

/**
 * Điều kiện người có thể được chỉ huy ghi danh vào bài kiểm tra.
 *
 * - Khoa: thành viên khoa + sinh viên các lớp
 * - Phòng/Ban: thành viên phòng mình + thành viên phòng khác (không gồm chỉ huy phòng khác)
 *   + mọi người thuộc các khoa (kể cả chỉ huy khoa) + sinh viên các lớp
 */
export async function buildEligibleEnrolleeWhere(
  commander: SessionUser,
  quizUnitId: number
): Promise<Prisma.UserWhereInput | null> {
  if (commander.role === "ADMIN") {
    return { isActive: true, role: { not: "ADMIN" } };
  }

  if (commander.role !== "UNIT_COMMANDER" || commander.unitId == null) {
    return null;
  }

  if (commander.unitId !== quizUnitId) {
    return null;
  }

  const commanderUnit = await prisma.unit.findUnique({
    where: { id: commander.unitId },
    select: { id: true, unitKind: true },
  });

  if (!commanderUnit) return null;

  const courseStudentFilter: Prisma.UserWhereInput = {
    isActive: true,
    courseEnrollments: { some: {} },
  };

  if (commanderUnit.unitKind === "KHOA") {
    return {
      isActive: true,
      OR: [
        { unitId: quizUnitId, role: "UNIT_MEMBER" },
        courseStudentFilter,
      ],
    };
  }

  const phongBanIds = await getUnitIdsByKind("PHONG_BAN");
  const khoaIds = await getUnitIdsByKind("KHOA");
  const otherPhongBanIds = phongBanIds.filter((id) => id !== quizUnitId);

  return {
    isActive: true,
    OR: [
      { unitId: quizUnitId, role: "UNIT_MEMBER" },
      {
        unitId: { in: otherPhongBanIds },
        role: "UNIT_MEMBER",
      },
      {
        unitId: { in: khoaIds },
        role: { in: ["UNIT_MEMBER", "UNIT_COMMANDER"] },
      },
      courseStudentFilter,
    ],
  };
}

export async function listEligibleEnrollees(
  commander: SessionUser,
  quizUnitId: number
) {
  const where = await buildEligibleEnrolleeWhere(commander, quizUnitId);
  if (!where) return [];

  return prisma.user.findMany({
    where,
    select: enrolleeSelect,
    orderBy: [{ unit: { sortOrder: "asc" } }, { fullName: "asc" }],
  });
}

export async function resolveEnrollmentUserIds(
  commander: SessionUser,
  quizUnitId: number,
  options: {
    userIds?: number[];
    enrollAllUnitMembers?: boolean;
    enrollAllCourseStudents?: boolean;
    enrollAllEligible?: boolean;
    courseId?: number;
  }
): Promise<number[]> {
  const where = await buildEligibleEnrolleeWhere(commander, quizUnitId);
  if (!where) return [];

  const eligible = await prisma.user.findMany({
    where,
    select: { id: true, unitId: true, role: true, courseEnrollments: true },
  });
  const eligibleMap = new Map(eligible.map((u) => [u.id, u]));
  const ids = new Set<number>();

  if (options.enrollAllUnitMembers) {
    for (const u of eligible) {
      if (u.unitId === quizUnitId && u.role === "UNIT_MEMBER") {
        ids.add(u.id);
      }
    }
  }

  if (options.enrollAllCourseStudents) {
    for (const u of eligible) {
      if (u.courseEnrollments.length > 0) {
        ids.add(u.id);
      }
    }
  }

  if (options.enrollAllEligible) {
    for (const u of eligible) {
      ids.add(u.id);
    }
  }

  if (options.courseId) {
    const inCourse = await prisma.courseEnrollment.findMany({
      where: { courseId: options.courseId },
      select: { userId: true },
    });
    for (const row of inCourse) {
      if (eligibleMap.has(row.userId)) {
        ids.add(row.userId);
      }
    }
  }

  for (const userId of options.userIds ?? []) {
    if (eligibleMap.has(userId)) {
      ids.add(userId);
    }
  }

  return Array.from(ids);
}

export async function getCommanderEnrollmentCapabilities(
  commander: SessionUser,
  quizUnitId: number
) {
  if (commander.role === "ADMIN") {
    return {
      unitKind: null as UnitKind | null,
      canEnrollCourseStudents: true,
      canEnrollAllEligible: true,
    };
  }

  if (commander.role !== "UNIT_COMMANDER" || commander.unitId !== quizUnitId) {
    return {
      unitKind: null as UnitKind | null,
      canEnrollCourseStudents: false,
      canEnrollAllEligible: false,
    };
  }

  const unit = await prisma.unit.findUnique({
    where: { id: commander.unitId },
    select: { unitKind: true },
  });

  const isPhongBan = unit?.unitKind === "PHONG_BAN";

  return {
    unitKind: unit?.unitKind ?? null,
    canEnrollCourseStudents: true,
    canEnrollAllEligible: isPhongBan,
  };
}
