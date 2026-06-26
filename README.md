# Lớp học trực tuyến - Hệ thống kiểm tra trắc nghiệm

Hệ thống kiểm tra trắc nghiệm nhiều lựa chọn (Moodle-like) cho Trường Cao Đẳng Kỹ Thuật Thông Tin, xây dựng bằng **Next.js**, **MySQL**, **Prisma**, **NextAuth**.

## Tính năng

- Giao diện portal TCKT TT (trang chủ, menu, thẻ tính năng, đăng nhập, tìm kiếm)
- Quản lý bài kiểm tra theo **13 đơn vị** (Phòng, Ban, Khoa, Tiểu đoàn)
- 3 vai trò: Quản trị hệ thống, Chỉ huy đơn vị, Thành viên đơn vị
- Ngân hàng câu hỏi trắc nghiệm, câu hỏi ngẫu nhiên, nhiều loại câu hỏi
- Tạo bài kiểm tra, gắn câu hỏi, ghi danh, xuất bản, giới hạn thời gian (tổng điểm đề = 10)
- Thành viên làm bài, nộp bài, chấm điểm tự động, xem kết quả
- Quản trị tài khoản người dùng theo đơn vị

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

Dữ liệu được tạo bởi `npm run db:seed`. Mỗi đơn vị có **1 chỉ huy** và **3 thành viên**.

### Mật khẩu chung

| Loại tài khoản | Mật khẩu |
|----------------|----------|
| Quản trị hệ thống | `admin123` |
| Chỉ huy đơn vị | `chi-huy123` |
| Thành viên đơn vị | `thanhvien123` |

### Quản trị (dùng để test)

| Kí danh | Mật khẩu | Vai trò |
|---------|----------|---------|
| `admin` | `admin123` | Quản trị hệ thống |

### Chỉ huy từng đơn vị

| Đơn vị | Kí danh | Mật khẩu |
|--------|---------|----------|
| Phòng Đào tạo | `chi-huy-pdt` | `chi-huy123` |
| Phòng Chính trị | `chi-huy-pct` | `chi-huy123` |
| Phòng Tham mưu hành chính | `chi-huy-ptmhc` | `chi-huy123` |
| Phòng Hậu cần kỹ thuật | `chi-huy-phc` | `chi-huy123` |
| Ban Tài chính | `chi-huy-btc` | `chi-huy123` |
| Ban Khảo thí và đảm bảo chất lượng | `chi-huy-bktdbcl` | `chi-huy123` |
| Ban Khoa học quân sự | `chi-huy-bkhqs` | `chi-huy123` |
| Khoa Cơ bản cơ sở | `chi-huy-kcbc` | `chi-huy123` |
| Khoa Công nghệ và an toàn thông tin | `chi-huy-kcntt` | `chi-huy123` |
| Khoa Khoa học xã hội và nhân văn | `chi-huy-khxh` | `chi-huy123` |
| Khoa Quân sự chung | `chi-huy-kqsc` | `chi-huy123` |
| Tiểu đoàn 1 | `chi-huy-td1` | `chi-huy123` |
| Tiểu đoàn 2 | `chi-huy-td2` | `chi-huy123` |

### Thành viên từng đơn vị

Quy tắc kí danh: `thanhvien-{mã đơn vị}-{số}` (số từ 1 đến 3), mật khẩu `thanhvien123`.

Ví dụ Khoa CNTT:

| Kí danh | Mật khẩu | Vai trò |
|---------|----------|---------|
| `thanhvien-kcntt-1` | `thanhvien123` | Thành viên |
| `thanhvien-kcntt-2` | `thanhvien123` | Thành viên |
| `thanhvien-kcntt-3` | `thanhvien123` | Thành viên |

Các đơn vị khác tương tự, thay `kcntt` bằng mã: `pdt`, `pct`, `ptmhc`, `phc`, `btc`, `bktdbcl`, `bkhqs`, `kcbc`, `khxh`, `kqsc`, `td1`, `td2`.

### Gợi ý đăng nhập thử nhanh

| Mục đích | Kí danh | Mật khẩu |
|----------|---------|----------|
| Tạo/quản lý bài kiểm tra (Khoa CNTT) | `chi-huy-kcntt` | `chi-huy123` |
| Làm bài kiểm tra (đã ghi danh sẵn) | `thanhvien-kcntt-1` | `thanhvien123` |
| Quản trị & test toàn hệ thống | `admin` | `admin123` |

> Sau seed, Khoa CNTT có bài kiểm tra mẫu và 2 thành viên đã được ghi danh. Một số thành viên KCNTT còn được gán vào lớp `CNTT-K24` / `ATTT-K24` để thử ghi danh theo lớp.

## Cấu trúc chính

```
app/
  page.tsx                 # Trang chủ portal
  login/                   # Đăng nhập
  quizzes/                 # Làm bài kiểm tra (thành viên)
  teacher/                 # Quản lý bài kiểm tra (chỉ huy)
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
