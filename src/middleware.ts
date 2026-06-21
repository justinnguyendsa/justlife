import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// 🛡️ Middleware bảo vệ. Dùng authConfig "nhẹ" (KHÔNG nạp provider/node:crypto ở Edge).
// Toàn bộ quyết định cho/chặn nằm trong callback `authorized` (auth.config.ts):
//  - /portal/*        → student-auth (giữ nguyên; /portal/login PUBLIC).
//  - owner-protected  → CHỈ khi owner-auth BẬT (cloud): Personal OS + /teaching/* + /api/{teaching,library,personal}/*
//                       → chưa phải owner thì redirect /login (trang) hoặc 401 (api).
//  - owner-auth TẮT (local dev) → authorized cho qua HẾT → DX cũ giữ nguyên (vào thẳng /today…).
//  - PUBLIC kể cả khi bật: /login, /portal/login, /api/auth/*, /share/*, /api/library/file/*, static.
//
// 🗣️ Bình dân: ở máy thì cửa mở; lên mạng thì khoá — chỉ Minh (Google) vào Personal + Dạy học,
//    học viên vào cổng riêng bằng mã, còn link chia sẻ tài liệu vẫn mở cho người ngoài.

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Khớp MỌI route trừ tài nguyên tĩnh & ảnh tối ưu của Next (để có thể bảo vệ cả (app) routes ở
  // đường gốc như /today, /tasks, /teaching…). Quyết định thực tế ở callback `authorized`.
  // Loại trừ: _next/static, _next/image, favicon, và các file tĩnh phổ biến ở /public.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|icons/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|otf|css|js|map)$).*)",
  ],
};
