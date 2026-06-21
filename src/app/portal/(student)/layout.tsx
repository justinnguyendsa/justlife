import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { auth, signOut } from "@/auth";
import { getSessionStudentId } from "@/lib/lms/portal-queries";
import { hasValidConsent } from "@/lib/lms/consent";
import { PortalNav } from "../PortalNav";

// 🟡 Shell RIÊNG cho khu học viên đã đăng nhập (/portal, /portal/grades, /portal/materials).
// Bảo mật: redirect nếu chưa auth (middleware đã chặn, đây là lớp phòng hờ — defense in depth).
// /portal/login KHÔNG nằm trong group này → KHÔNG bị redirect, không vòng lặp.
// KHÔNG dùng shell/nav Personal, KHÔNG ModeSwitch (khu học viên RIÊNG).
//
// Consent gate (S5, AC-11, R-JL-STUDENT-PII-01): HV chưa thành niên (isMinor) mà CHƯA có đồng ý
// phụ huynh → REDIRECT sang /portal/consent-required (NGOÀI group này) TRƯỚC khi render children
// → các trang con KHÔNG chạy query dữ liệu lớp (chống lộ dữ liệu qua RSC payload). HV thường /
// minor đã đồng ý → vào bình thường.
//
// 🗣️ Bình dân: khung khu học viên; chưa đăng nhập thì đá ra. Học viên chưa đủ 18 mà chưa có
//    đồng ý của phụ huynh bị đưa sang trang nhắc — và KHÔNG tải bất kỳ dữ liệu lớp nào.

export default async function StudentShell({ children }: { children: React.ReactNode }) {
  // KHÔNG render khu học viên nếu chưa auth.
  const studentId = await getSessionStudentId();
  if (!studentId) redirect("/portal/login");

  // Phiên CHỈ chứa id + cờ (không PII). Hiển thị nhãn chung — không lộ tên trong khung.
  const session = await auth();
  const displayName = session?.user?.name?.trim() || "Học viên";

  // Consent gate cho HV chưa thành niên: cờ isMinor LẤY TỪ session (server-derived).
  // Redirect SỚM (trước khi render children) → page con không fetch dữ liệu lớp cho minor chưa đủ điều kiện.
  if (session?.isMinor === true && !(await hasValidConsent(studentId, true))) {
    redirect("/portal/consent-required");
  }

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/portal/login" });
  }

  return (
    <div className="portal">
      <header className="portal-top">
        <span className="portal-brand">
          <span className="dot" aria-hidden />
          just<b>life</b>
          <span className="portal-brand-tag">· Lớp học</span>
        </span>

        <PortalNav variant="top" />

        <div className="portal-who">
          <span className="portal-name" title={displayName}>{displayName}</span>
          <form action={doSignOut}>
            <button type="submit" className="portal-logout">
              <LogOut strokeWidth={2} aria-hidden />
              <span>Đăng xuất</span>
            </button>
          </form>
        </div>
      </header>

      <main className="portal-main">{children}</main>

      <PortalNav variant="bottom" />
    </div>
  );
}
