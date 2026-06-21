import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

// Middleware bảo vệ cổng học viên (Edge runtime).
// Dùng authConfig NỀN (không DB/node:crypto) → đọc session từ cookie JWT.
// Bảo vệ: /portal/:path* (page → redirect /portal/login) + /api/lms/:path* (api → 401).
// KHÔNG đụng route Personal OS (R-JL-TWO-FACES-01).
//
// 🗣️ Bình dân: chưa đăng nhập mà mở trang cổng học viên thì bị đẩy về trang đăng nhập;
//    gọi API học viên thì trả 401. Phần cá nhân của Minh không bị ảnh hưởng.

const { auth } = NextAuth(authConfig);

const LOGIN_PATH = "/portal/login";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.studentId;

  const isApi = pathname.startsWith("/api/lms");
  const isPortal = pathname.startsWith("/portal");

  // Trang đăng nhập luôn cho qua (tránh vòng lặp redirect).
  if (pathname === LOGIN_PATH || pathname.startsWith("/portal/login")) {
    return NextResponse.next();
  }

  if (!isLoggedIn && (isApi || isPortal)) {
    if (isApi) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 },
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

// CHỈ chạy trên 2 nhóm route này — KHÔNG match route Personal (/today, /tasks, /teaching, …).
export const config = {
  matcher: ["/portal/:path*", "/api/lms/:path*"],
};
