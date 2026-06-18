# Lớp học trực tuyến - Hệ thống kiểm tra trắc nghiệm

Hệ thống kiểm tra trắc nghiệm nhiều lựa chọn (Moodle-like) cho Trường Cao Đẳng Kỹ Thuật Thông Tin, xây dựng bằng **Next.js 14**, **MySQL**, **Prisma**, **NextAuth**.

## Tính năng

- Giao diện portal TCKT TT (trang chủ, menu, thẻ tính năng, đăng nhập, tìm kiếm)
- 3 vai trò: Admin, Giáo viên, Sinh viên
- Ngân hàng câu hỏi trắc nghiệm (4 đáp án, 1 đáp án đúng)
- Tạo bài kiểm tra, gắn câu hỏi, xuất bản, giới hạn thời gian, xáo trộn
- Sinh viên làm bài, nộp bài, chấm điểm tự động, xem kết quả
- Quản trị tài khoản người dùng
- Trang placeholder: Tài liệu, Diễn đàn; Lớp học hiển thị danh sách lớp

## Yêu cầu

- Node.js 18+
- MySQL 8+ hoặc MariaDB

## Cài đặt

1. **Clone và cài dependencies**

```bash
npm install
```

2. **Cấu hình môi trường**

```bash
cp .env.example .env
```

Chỉnh `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` trong `.env`.

3. **Tạo database**

```sql
CREATE DATABASE exam_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

4. **Tạo bảng và seed dữ liệu mẫu**

```bash
npm run db:setup
```

Hoặc từng bước:

```bash
npx prisma db push
npx prisma db seed
```

> **Lưu ý:** Nếu `prisma migrate dev` báo lỗi shadow database (`P3014` / `P1010`), dùng `prisma db push` thay thế. Lệnh này không cần quyền `CREATE DATABASE` trên MySQL.
>
> Nếu vẫn muốn dùng migrate, cấp thêm quyền cho user MySQL:
>
> ```sql
> GRANT ALL PRIVILEGES ON exam_system.* TO 'admin'@'localhost';
> GRANT CREATE ON *.* TO 'admin'@'localhost';
> FLUSH PRIVILEGES;
> ```

5. **Chạy ứng dụng**

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

## Tài khoản mẫu

| Kí danh   | Mật khẩu   | Vai trò    |
|-----------|------------|------------|
| admin     | admin123   | Admin      |
| teacher1  | teacher123 | Giáo viên  |
| student1  | student123 | Sinh viên  |

## Cấu trúc chính

```
app/
  page.tsx                 # Trang chủ portal
  login/                   # Đăng nhập
  quizzes/                 # Làm bài kiểm tra (sinh viên)
  teacher/                 # Quản lý câu hỏi & bài kiểm tra
  admin/users/             # Quản lý người dùng
  api/                     # REST API backend
components/portal/         # UI portal TCKT TT
components/quiz/           # Form câu hỏi, làm bài, kết quả
prisma/schema.prisma       # Database schema
```

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npx prisma studio    # Xem database
```
