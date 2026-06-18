import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

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
    category: "Phần cứng",
    options: [
      { text: "Ổ cứng", isCorrect: false },
      { text: "RAM", isCorrect: true },
      { text: "ROM", isCorrect: false },
      { text: "Nguồn điện", isCorrect: false },
    ],
  },
  {
    content: "Giao thức nào được sử dụng để truyền trang web trên Internet?",
    category: "Mạng",
    options: [
      { text: "FTP", isCorrect: false },
      { text: "HTTP/HTTPS", isCorrect: true },
      { text: "SMTP", isCorrect: false },
      { text: "SNMP", isCorrect: false },
    ],
  },
  {
    content: "Hệ điều hành Windows thuộc loại phần mềm nào?",
    category: "Hệ điều hành",
    options: [
      { text: "Phần mềm ứng dụng", isCorrect: false },
      { text: "Phần mềm hệ thống", isCorrect: true },
      { text: "Phần mềm tiện ích", isCorrect: false },
      { text: "Phần mềm diệt virus", isCorrect: false },
    ],
  },
  {
    content: "Địa chỉ IP phiên bản 4 có độ dài bao nhiêu bit?",
    category: "Mạng",
    options: [
      { text: "16 bit", isCorrect: false },
      { text: "32 bit", isCorrect: true },
      { text: "64 bit", isCorrect: false },
      { text: "128 bit", isCorrect: false },
    ],
  },
  {
    content: "Thiết bị nào kết nối các mạng LAN với nhau?",
    category: "Mạng",
    options: [
      { text: "Switch", isCorrect: false },
      { text: "Router", isCorrect: true },
      { text: "Hub", isCorrect: false },
      { text: "Modem", isCorrect: false },
    ],
  },
  {
    content: "Ngôn ngữ lập trình nào chạy trên trình duyệt web?",
    category: "Lập trình",
    options: [
      { text: "C++", isCorrect: false },
      { text: "JavaScript", isCorrect: true },
      { text: "Assembly", isCorrect: false },
      { text: "COBOL", isCorrect: false },
    ],
  },
  {
    content: "SQL là viết tắt của?",
    category: "Cơ sở dữ liệu",
    options: [
      { text: "Structured Query Language", isCorrect: true },
      { text: "Simple Query Logic", isCorrect: false },
      { text: "System Quality Layer", isCorrect: false },
      { text: "Standard Queue List", isCorrect: false },
    ],
  },
  {
    content: "Phím tắt Ctrl + C trong Windows dùng để?",
    category: "Tin học cơ bản",
    options: [
      { text: "Sao chép", isCorrect: true },
      { text: "Cắt", isCorrect: false },
      { text: "Dán", isCorrect: false },
      { text: "Lưu file", isCorrect: false },
    ],
  },
  {
    content: "Đơn vị đo dung lượng lớn hơn Megabyte (MB) là?",
    category: "Tin học cơ bản",
    options: [
      { text: "Kilobyte", isCorrect: false },
      { text: "Gigabyte", isCorrect: true },
      { text: "Bit", isCorrect: false },
      { text: "Hertz", isCorrect: false },
    ],
  },
  {
    content: "Trong mô hình OSI, tầng nào chịu trách nhiệm định tuyến?",
    category: "Mạng",
    options: [
      { text: "Tầng vật lý", isCorrect: false },
      { text: "Tầng mạng (Network)", isCorrect: true },
      { text: "Tầng giao vận", isCorrect: false },
      { text: "Tầng ứng dụng", isCorrect: false },
    ],
  },
];

async function createUser(
  username: string,
  password: string,
  fullName: string,
  role: Role
) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { username },
    update: {},
    create: { username, passwordHash, fullName, role },
  });
}

async function main() {
  const admin = await createUser("admin", "admin123", "Quản trị viên", "ADMIN");
  const teacher1 = await createUser(
    "teacher1",
    "teacher123",
    "Giáo viên Nguyễn Văn A",
    "TEACHER"
  );
  await createUser("teacher2", "teacher123", "Giáo viên Trần Thị B", "TEACHER");

  for (let i = 1; i <= 5; i++) {
    await createUser(
      `student${i}`,
      "student123",
      `Sinh viên ${i}`,
      "STUDENT"
    );
  }

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

  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
  });

  await prisma.courseEnrollment.createMany({
    data: [
      ...students.slice(0, 4).map((s) => ({ courseId: course.id, userId: s.id })),
      ...students.slice(3, 5).map((s) => ({ courseId: course2.id, userId: s.id })),
    ],
    skipDuplicates: true,
  });

  const quiz1 = await prisma.quiz.create({
    data: {
      title: "Kiểm tra giữa kỳ - Tin học cơ bản",
      description: "Bài kiểm tra trắc nghiệm môn Tin học cơ bản",
      courseId: course.id,
      timeLimitMinutes: 30,
      shuffleQuestions: true,
      passingScore: 50,
      isPublished: true,
      createdById: teacher1.id,
      questionCategories: {
        create: [
          { name: "Mặc định cho bài kiểm tra" },
          { name: "Tin học cơ bản" },
        ],
      },
    },
    include: { questionCategories: true },
  });

  const quiz1DefaultCat = quiz1.questionCategories.find(
    (c) => c.name === "Mặc định cho bài kiểm tra"
  )!;

  for (let index = 0; index < 5; index++) {
    const q = sampleQuestions[index];
    const question = await prisma.question.create({
      data: {
        content: q.content,
        categoryId: quiz1DefaultCat.id,
        createdById: teacher1.id,
        options: { create: mapSeedOptions(q.options) },
      },
    });
    await prisma.quizQuestion.create({
      data: { quizId: quiz1.id, questionId: question.id, order: index },
    });
  }

  const studentsEnrolled = await prisma.user.findMany({
    where: { role: "STUDENT" },
  });

  await prisma.quizParticipant.createMany({
    data: studentsEnrolled.slice(0, 3).map((s) => ({
      quizId: quiz1.id,
      userId: s.id,
    })),
  });

  const quiz2 = await prisma.quiz.create({
    data: {
      title: "Ôn tập mạng máy tính",
      description: "Bài ôn tập các kiến thức về mạng",
      courseId: course.id,
      timeLimitMinutes: 20,
      shuffleQuestions: false,
      passingScore: 60,
      isPublished: false,
      createdById: teacher1.id,
      questionCategories: {
        create: [
          { name: "Mặc định cho bài kiểm tra" },
          { name: "Mạng" },
        ],
      },
    },
    include: { questionCategories: true },
  });

  const quiz2DefaultCat = quiz2.questionCategories.find(
    (c) => c.name === "Mặc định cho bài kiểm tra"
  )!;

  for (let index = 0; index < 5; index++) {
    const q = sampleQuestions[index + 5];
    const question = await prisma.question.create({
      data: {
        content: q.content,
        categoryId: quiz2DefaultCat.id,
        createdById: teacher1.id,
        options: { create: mapSeedOptions(q.options) },
      },
    });
    await prisma.quizQuestion.create({
      data: { quizId: quiz2.id, questionId: question.id, order: index },
    });
  }

  console.log("Seed completed:", {
    admin: admin.username,
    quiz1: quiz1.title,
    quiz2: quiz2.title,
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
