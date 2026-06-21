import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionStudentId } from "@/lib/lms/portal-queries";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập · Lớp học — justlife",
};

// PUBLIC — middleware cho phép. Đã đăng nhập rồi thì vào thẳng cổng (tránh ở lại trang login).
// Form nhập MÃ TRUY CẬP; nút Google ẩn ở P5a (Google chờ go-live P5b).

export default async function PortalLoginPage() {
  const studentId = await getSessionStudentId();
  if (studentId) redirect("/portal");

  return (
    <div className="portal-login">
      <div className="portal-login-card">
        <span className="portal-login-brand">
          <span className="dot" aria-hidden />
          just<b>life</b>
        </span>
        <h1>Cổng học viên</h1>
        <p className="lead">Đăng nhập để xem điểm và tài liệu lớp của bạn.</p>

        <LoginForm />
      </div>
    </div>
  );
}
