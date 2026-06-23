import type { NextAuthConfig } from "next-auth";

// ⚙️ Cấu hình Auth.js v5 — phần KHÔNG phụ thuộc Node runtime (an toàn cho middleware/Edge).
// Provider được nạp ở `auth.ts` (cần node:crypto qua verifyAccessCode / Google OAuth) — KHÔNG để ở đây.
// ADR-002 Q3 + SPEC-P5a §3: session httpOnly+Secure+SameSite, studentId SERVER-DERIVED qua callback.
//
// 🛡️ P5b owner-auth: thêm CHỦ SỞ HỮU (Minh) qua Google. Khi chạy cloud (có Google + OWNER_EMAIL),
//    mọi route Personal OS + Dạy học yêu cầu role "owner". Local dev (không có Google env) → MỞ như cũ.
//
// 🗣️ Bình dân: file này định nghĩa "luật phiên đăng nhập" dùng được cả ở lớp bảo vệ (middleware)
//    lẫn ở server. Khi deploy lên mạng thì khoá lại (chỉ Minh vào được); chạy ở máy thì mở.

// 🔎 Edge-safe: chỉ đọc process.env (không import node:crypto / DB). Dùng được trong middleware.
// Owner-auth BẬT khi có cấu hình Google + OWNER_EMAIL → tức môi trường cloud/production.
// KHÔNG có cấu hình này (máy local của Minh) → coi như tắt → vào thẳng, DX cũ giữ nguyên.
export function ownerAuthEnabledEnv(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.OWNER_EMAIL);
}

// Các tiền tố LUÔN public — kể cả khi owner-auth bật (chống tự khoá cổng học viên / link chia sẻ).
//  - /login            : trang đăng nhập chủ sở hữu
//  - /portal/login     : cổng học viên (student-auth tự xử trong nhánh isPortal)
//  - /api/auth         : endpoint nội bộ Auth.js (signin/callback/csrf…)
//  - /share            : LINK CHIA SẺ công khai (tài liệu gửi người ngoài) — không được khoá
//  - /api/library/file : phục vụ file cho link chia sẻ ở trên (dùng chung) — phải mở
const ALWAYS_PUBLIC_PREFIXES = ["/api/auth", "/share/", "/api/library/file", "/api/debug-auth"];
const ALWAYS_PUBLIC_EXACT = ["/login", "/portal/login"];

function isAlwaysPublic(path: string): boolean {
  if (ALWAYS_PUBLIC_EXACT.includes(path)) return true;
  return ALWAYS_PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p));
}

// API nào? (chưa-auth → trả 401 thay vì redirect — đúng chuẩn cho client gọi API)
function isApiPath(path: string): boolean {
  return path.startsWith("/api/");
}

export const authConfig = {
  // Provider thật nạp ở auth.ts (cần node:crypto / Google). Ở đây để rỗng cho middleware (Edge-safe).
  providers: [],
  // JWT session: không cần DB adapter cho phiên; danh tính nằm trong token (chỉ id + cờ, KHÔNG PII).
  session: { strategy: "jwt" },
  pages: {
    // Mặc định cho lớp middleware là cổng học viên; owner redirect /login được xử riêng trong authorized().
    signIn: "/portal/login",
    // Lỗi auth (vd AccessDenied / OAuthCallback) → đưa về /login kèm ?error= để HIỆN mã lỗi.
    error: "/login",
  },
  // KHÔNG ghi đè cookie: để Auth.js dùng mặc định chuẩn (prod tự thêm tiền tố __Secure-,
  // httpOnly + SameSite=Lax + Secure). Việc ép tên "authjs.session-token" ở prod (https) trước đây
  // KHÔNG chuẩn → có thể khiến phiên không được lưu/đọc đúng trên Vercel.
  callbacks: {
    // Gắn danh tính vào token KHI đăng nhập.
    //  - Học viên (access-code): id + cờ học viên, role "student" — KHÔNG lưu tên/email (chống lộ PII).
    //  - Chủ sở hữu (Google): role "owner" CHỈ khi email khớp OWNER_EMAIL (an toàn kép cùng signIn ở auth.ts).
    jwt({ token, user }) {
      if (user) {
        // Phân biệt bằng tín hiệu ĐÁNG TIN, KHÔNG dựa account.provider (Auth.js v5 beta có thể KHÔNG
        // khớp "google" trên luồng OAuth → trước đây gán nhầm role="student" cho chủ sở hữu).
        //  - Học viên: authorize() của access-code trả về studentId.
        //  - Chủ sở hữu (Google): KHÔNG có studentId. signIn (auth.ts) đã CHẶN trước — chỉ cho qua khi
        //    email === OWNER_EMAIL — nên user không-studentId tới được đây ⟹ chính là owner.
        const u = user as { studentId?: string; lmsUserId?: string; isMinor?: boolean };
        if (u.studentId) {
          token.studentId = u.studentId;
          token.lmsUserId = u.lmsUserId;
          token.isMinor = u.isMinor;
          token.role = "student";
        } else {
          token.role = "owner";
          token.studentId = undefined;
          token.lmsUserId = undefined;
          token.isMinor = undefined;
        }
      }
      return token;
    },
    // Copy danh tính từ token sang session. studentId/role LẤY TỪ ĐÂY (server-derived) — KHÔNG tin client.
    session({ session, token }) {
      session.studentId = token.studentId as string | undefined;
      session.lmsUserId = token.lmsUserId as string | undefined;
      session.isMinor = token.isMinor as boolean | undefined;
      session.role = token.role as string | undefined;
      return session;
    },
    // 🚪 Cổng tầng middleware (chạy trước mỗi request khớp matcher).
    //  - /portal/* : luôn yêu cầu student (giữ nguyên — KHÔNG đụng student-auth).
    //  - owner-protected : CHỈ khi owner-auth bật (cloud). Local (tắt) → cho qua hết → DX cũ.
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;

      // 1) Khu học viên — luôn bảo vệ bằng student-auth, độc lập owner-auth.
      const isPortal = path.startsWith("/portal");
      const isPortalLogin = path === "/portal/login";
      if (isPortal) {
        if (isPortalLogin) return true; // PUBLIC
        return auth?.role === "student";
      }

      // 2) Ngoài /portal: nếu owner-auth TẮT (local dev) → cho qua tất cả (giữ DX hiện tại).
      if (!ownerAuthEnabledEnv()) return true;

      // 3) owner-auth BẬT (cloud): các route luôn-public vẫn cho qua.
      if (isAlwaysPublic(path)) return true;

      // 4) Còn lại (Personal OS + Dạy học + API tương ứng) → yêu cầu role owner.
      if (auth?.role === "owner") return true;

      // Chưa phải owner:
      //  - API → trả 401 JSON (không redirect HTML cho lệnh gọi API).
      if (isApiPath(path)) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }
      //  - Trang → redirect về /login (trang đăng nhập chủ sở hữu).
      const loginUrl = new URL("/login", request.nextUrl.origin);
      return Response.redirect(loginUrl);
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
