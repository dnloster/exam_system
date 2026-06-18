import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      error:
        "API danh mục chung đã ngừng dùng. Dùng /api/quizzes/{quizId}/categories cho từng bài kiểm tra.",
    },
    { status: 410 }
  );
}
