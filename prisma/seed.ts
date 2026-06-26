import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ORGANIZATIONAL_UNITS } from "../lib/units";
import { hashQuizAccessPassword } from "../lib/quiz-access-password";

const prisma = new PrismaClient();

function mapSeedOptions(
  options: { text: string; isCorrect: boolean }[]
) {
  const correctCount = options.filter((o) => o.isCorrect).length;
  const each = correctCount > 0 ? 100 / correctCount : 0;
  return options.map((o) => ({
    text: o.text,
    isCorrect: o.isCorrect,
    gradePercent: o.isCorrect ? each : 0,
  }));
}

const sampleQuestions = [
  {
    content: "Thành phần nào lưu trữ dữ liệu tạm thời trong quá trình xử lý của CPU?",
    options: [
      { text: "Ổ cứng", isCorrect: false },
      { text: "RAM", isCorrect: true },
      { text: "ROM", isCorrect: false },
      { text: "Nguồn điện", isCorrect: false },
    ],
  },
  {
    content: "Giao thức nào được sử dụng để truyền trang web trên Internet?",
    options: [
      { text: "FTP", isCorrect: false },
      { text: "HTTP/HTTPS", isCorrect: true },
      { text: "SMTP", isCorrect: false },
      { text: "SNMP", isCorrect: false },
    ],
  },
  {
    content: "Hệ điều hành Windows thuộc loại phần mềm nào?",
    options: [
      { text: "Phần mềm ứng dụng", isCorrect: false },
      { text: "Phần mềm hệ thống", isCorrect: true },
      { text: "Phần mềm tiện ích", isCorrect: false },
      { text: "Phần mềm diệt virus", isCorrect: false },
    ],
  },
  {
    content: "Địa chỉ IP phiên bản 4 có độ dài bao nhiêu bit?",
    options: [
      { text: "16 bit", isCorrect: false },
      { text: "32 bit", isCorrect: true },
      { text: "64 bit", isCorrect: false },
      { text: "128 bit", isCorrect: false },
    ],
  },
  {
    content: "Thiết bị nào kết nối các mạng LAN với nhau?",
    options: [
      { text: "Switch", isCorrect: false },
      { text: "Router", isCorrect: true },
      { text: "Hub", isCorrect: false },
      { text: "Modem", isCorrect: false },
    ],
  },
];

async function createUser(
  username: string,
  password: string,
  fullName: string,
  role: Role,
  unitId?: number
) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { username },
    update: { fullName, role, unitId: unitId ?? null },
    create: { username, passwordHash, fullName, role, unitId: unitId ?? null },
  });
}

async function main() {
  const admin = await createUser(
    "admin",
    "admin123",
    "Quản trị viên hệ thống",
    "ADMIN"
  );

  const units = [];
  for (const unitDef of ORGANIZATIONAL_UNITS) {
    const unit = await prisma.unit.upsert({
      where: { code: unitDef.code },
      update: {
        name: unitDef.name,
        sortOrder: unitDef.sortOrder,
        unitKind: unitDef.unitKind,
      },
      create: {
        code: unitDef.code,
        name: unitDef.name,
        sortOrder: unitDef.sortOrder,
        unitKind: unitDef.unitKind,
      },
    });
    units.push(unit);

    await createUser(
      `chi-huy-${unitDef.code.toLowerCase()}`,
      "chi-huy123",
      `Chỉ huy ${unitDef.name}`,
      "UNIT_COMMANDER",
      unit.id
    );

    for (let i = 1; i <= 3; i++) {
      await createUser(
        `thanhvien-${unitDef.code.toLowerCase()}-${i}`,
        "thanhvien123",
        `Thành viên ${i} - ${unitDef.name}`,
        "UNIT_MEMBER",
        unit.id
      );
    }
  }

  const kcntt = units.find((u) => u.code === "KCNTT")!;
  const commanderKcntt = await prisma.user.findUnique({
    where: { username: "chi-huy-kcntt" },
  });

  const course = await prisma.course.upsert({
    where: { code: "CNTT-K24" },
    update: {},
    create: {
      code: "CNTT-K24",
      name: "Công nghệ thông tin K24",
      description: "Lớp Công nghệ thông tin khóa 24",
    },
  });

  const course2 = await prisma.course.upsert({
    where: { code: "ATTT-K24" },
    update: {},
    create: {
      code: "ATTT-K24",
      name: "An toàn thông tin K24",
      description: "Lớp An toàn thông tin khóa 24",
    },
  });

  const kcnttMembers = await prisma.user.findMany({
    where: { unitId: kcntt.id, role: "UNIT_MEMBER" },
    take: 4,
  });

  await prisma.courseEnrollment.createMany({
    data: [
      ...kcnttMembers.slice(0, 3).map((s) => ({
        courseId: course.id,
        userId: s.id,
      })),
      ...kcnttMembers.slice(2, 4).map((s) => ({
        courseId: course2.id,
        userId: s.id,
      })),
    ],
    skipDuplicates: true,
  });

  const quiz = await prisma.quiz.create({
    data: {
      title: "Kiểm tra giữa kỳ - Tin học cơ bản",
      description: "Bài kiểm tra trắc nghiệm dành cho Khoa Công nghệ và an toàn thông tin",
      unitId: kcntt.id,
      timeLimitMinutes: 30,
      shuffleQuestions: true,
      passingScore: 50,
      isPublished: true,
      accessPasswordHash: await hashQuizAccessPassword("thi123"),
      createdById: commanderKcntt!.id,
      questionCategories: {
        create: [{ name: "Mặc định cho bài kiểm tra" }],
      },
    },
    include: { questionCategories: true },
  });

  const defaultCat = quiz.questionCategories[0]!;

  for (let index = 0; index < sampleQuestions.length; index++) {
    const q = sampleQuestions[index];
    const question = await prisma.question.create({
      data: {
        content: q.content,
        categoryId: defaultCat.id,
        createdById: commanderKcntt!.id,
        options: { create: mapSeedOptions(q.options) },
      },
    });
    await prisma.quizQuestion.create({
      data: { quizId: quiz.id, questionId: question.id, order: index },
    });
  }

  const members = await prisma.user.findMany({
    where: { unitId: kcntt.id, role: "UNIT_MEMBER" },
    take: 2,
  });

  await prisma.quizParticipant.createMany({
    data: members.map((m) => ({ quizId: quiz.id, userId: m.id })),
    skipDuplicates: true,
  });

  console.log("Seed completed:", {
    admin: admin.username,
    units: units.length,
    sampleQuiz: quiz.title,
    sampleCommander: "chi-huy-kcntt / chi-huy123",
    sampleMember: "thanhvien-kcntt-1 / thanhvien123",
    sampleQuizPassword: "thi123",
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
