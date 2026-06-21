import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck, Laptop } from "lucide-react";
import { isOwnerAuthEnabled, getOwnerSession } from "@/lib/auth-guard";
import { OwnerSignIn } from "./OwnerSignIn";

export const metadata: Metadata = {
  title: "Đăng nhập · Chủ sở hữu — justlife",
};

// 🔐 Trang đăng nhập CHỦ SỞ HỮU (Minh) — token-only, KHÔNG dùng shell (app), 100% tiếng Việt.
//  - Owner-auth BẬT (cloud): hiện nút "Đăng nhập với Google". Đã là owner → vào thẳng /today.
//  - Owner-auth TẮT (local dev): KHÔNG bắt đăng nhập → hiện thông báo + cho vào thẳng.
//
// 🗣️ Bình dân: khi app ở trên mạng, Minh bấm "Đăng nhập với Google" để vào nhà mình.
//    Khi chạy ở máy thì khỏi đăng nhập — bấm là vào luôn.

// Chuyển mã lỗi Auth.js → câu tiếng Việt dễ hiểu (giúp chẩn đoán nhanh).
function authErrorMessage(code: string): string {
  switch (code) {
    case "AccessDenied":
      return "Tài khoản Google vừa dùng KHÔNG khớp OWNER_EMAIL → hãy đăng nhập đúng Gmail đã cấu hình (thử cửa sổ ẩn danh).";
    case "Configuration":
      return "Lỗi cấu hình máy chủ (thiếu/sai biến: AUTH_SECRET / Google / OWNER_EMAIL).";
    case "OAuthSignin":
    case "OAuthCallback":
    case "OAuthCallbackError":
    case "Callback":
      return "Lỗi OAuth khi quay lại từ Google (cookie state/PKCE không khớp).";
    case "Verification":
      return "Phiên xác thực đã hết hạn. Vui lòng thử lại.";
    default:
      return "Đăng nhập không thành công.";
  }
}

export default async function OwnerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const enabled = isOwnerAuthEnabled();
  const { error } = await searchParams;

  // Đã đăng nhập owner rồi → khỏi ở lại trang login.
  if (enabled) {
    const session = await getOwnerSession();
    if (session) redirect("/today");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-5)",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div className="brand" style={{ padding: 0 }}>
          just<b>life</b>
        </div>

        {enabled ? (
          <>
            <h1 style={{ fontSize: 19, fontWeight: 800, marginTop: "var(--space-4)", display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck strokeWidth={2} width={20} height={20} style={{ color: "var(--brand)" }} />
              Đăng nhập chủ sở hữu
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: "var(--space-1)" }}>
              Khu cá nhân và khu dạy học chỉ dành cho chủ sở hữu. Vui lòng đăng nhập bằng Google.
            </p>

            {error && (
              <div
                style={{
                  marginTop: "var(--space-4)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--danger-soft, #fdecea)",
                  border: "1px solid var(--danger, #d92d20)",
                  color: "var(--danger, #b42318)",
                  fontSize: 13,
                }}
              >
                {authErrorMessage(error)}
                <div style={{ marginTop: 4, fontSize: 11, opacity: 0.85 }}>
                  Mã lỗi: <b>{error}</b>
                </div>
              </div>
            )}

            <div style={{ marginTop: "var(--space-5)" }}>
              <OwnerSignIn />
            </div>

            <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: "var(--space-4)", textAlign: "center" }}>
              Học viên đăng nhập tại{" "}
              <a href="/portal/login" style={{ color: "var(--brand)", fontWeight: 600 }}>
                cổng học viên
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 19, fontWeight: 800, marginTop: "var(--space-4)", display: "flex", alignItems: "center", gap: 8 }}>
              <Laptop strokeWidth={2} width={20} height={20} style={{ color: "var(--brand)" }} />
              Chế độ máy cục bộ
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: "var(--space-1)" }}>
              Đang chạy ở máy cục bộ nên không cần đăng nhập. Bạn có thể vào thẳng ứng dụng.
            </p>
            <div style={{ marginTop: "var(--space-5)" }}>
              <a href="/today" className="btn primary block">
                Vào ứng dụng
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
