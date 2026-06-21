import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ownerAuthEnabledEnv } from "@/auth.config";

// 🛡️ Lớp gate CHỦ SỞ HỮU (server-side) cho Personal OS + khu Dạy học (P5b).
// Dùng kèm middleware (defense-in-depth): middleware chặn ở Edge, các helper này chặn ở server
// (Server Component / Server Action / Route Handler) để không lọt nếu matcher bỏ sót.
//
// 🗣️ Bình dân: "người gác cửa" phía máy chủ. Khi app chạy trên mạng thì chỉ Minh vào được;
//    khi chạy ở máy (chưa cấu hình Google) thì cửa mở — không bắt đăng nhập, code chạy như cũ.

/**
 * Owner-auth có BẬT không? = đang ở môi trường cloud/prod (có Google + OWNER_EMAIL).
 * Local dev (thiếu cấu hình) → false → mọi guard là no-op → DX cũ giữ nguyên.
 */
export function isOwnerAuthEnabled(): boolean {
  return ownerAuthEnabledEnv();
}

/**
 * Bắt buộc phiên CHỦ SỞ HỮU cho trang/server-action.
 *  - Owner-auth TẮT (local) → no-op (cho qua), KHÔNG bắt đăng nhập.
 *  - Owner-auth BẬT mà chưa phải owner → redirect /login.
 * Gọi ở đầu Server Component nhạy cảm nếu muốn chắc chắn (middleware vốn đã chặn lớp ngoài).
 */
export async function requireOwner(): Promise<void> {
  if (!isOwnerAuthEnabled()) return; // local dev → mở
  const session = await auth();
  if (session?.role !== "owner") {
    redirect("/login");
  }
}

/**
 * Lấy phiên chủ sở hữu (hoặc null).
 *  - Owner-auth TẮT (local) → trả null mà KHÔNG redirect (không cần đăng nhập).
 *  - Owner-auth BẬT → trả session nếu là owner, ngược lại null.
 * Hữu ích cho UI tuỳ biến (vd: ẩn/hiện nút Đăng xuất) — KHÔNG dùng để chặn (dùng requireOwner cho việc đó).
 */
export async function getOwnerSession() {
  if (!isOwnerAuthEnabled()) return null;
  const session = await auth();
  return session?.role === "owner" ? session : null;
}
