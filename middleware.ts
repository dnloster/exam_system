import { NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import withAuth from "next-auth/middleware";

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (path.startsWith("/teacher") && role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        const protectedPaths = ["/admin", "/teacher", "/quizzes"];
        const needsAuth = protectedPaths.some((p) => path.startsWith(p));
        if (!needsAuth) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/quizzes/:path*"],
};
