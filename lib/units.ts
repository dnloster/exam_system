export type UnitKind = "KHOA" | "PHONG_BAN";

export const ORGANIZATIONAL_UNITS: {
  code: string;
  name: string;
  sortOrder: number;
  unitKind: UnitKind;
}[] = [
  { code: "PDT", name: "Phòng Đào tạo", sortOrder: 1, unitKind: "PHONG_BAN" },
  { code: "PCT", name: "Phòng Chính trị", sortOrder: 2, unitKind: "PHONG_BAN" },
  { code: "PTMHC", name: "Phòng Tham mưu hành chính", sortOrder: 3, unitKind: "PHONG_BAN" },
  { code: "PHC", name: "Phòng Hậu cần kỹ thuật", sortOrder: 4, unitKind: "PHONG_BAN" },
  { code: "BTC", name: "Ban Tài chính", sortOrder: 5, unitKind: "PHONG_BAN" },
  { code: "BKTDBCL", name: "Ban Khảo thí và đảm bảo chất lượng", sortOrder: 6, unitKind: "PHONG_BAN" },
  { code: "BKHQS", name: "Ban Khoa học quân sự", sortOrder: 7, unitKind: "PHONG_BAN" },
  { code: "KCBC", name: "Khoa Cơ bản cơ sở", sortOrder: 8, unitKind: "KHOA" },
  { code: "KCNTT", name: "Khoa Công nghệ và an toàn thông tin", sortOrder: 9, unitKind: "KHOA" },
  { code: "KHXH", name: "Khoa Khoa học xã hội và nhân văn", sortOrder: 10, unitKind: "KHOA" },
  { code: "KQSC", name: "Khoa Quân sự chung", sortOrder: 11, unitKind: "KHOA" },
  { code: "TD1", name: "Tiểu đoàn 1", sortOrder: 12, unitKind: "PHONG_BAN" },
  { code: "TD2", name: "Tiểu đoàn 2", sortOrder: 13, unitKind: "PHONG_BAN" },
];

export function unitKindLabel(kind: UnitKind): string {
  return kind === "KHOA" ? "Khoa" : "Phòng/Ban";
}
