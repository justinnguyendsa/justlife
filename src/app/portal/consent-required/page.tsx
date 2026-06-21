import { redirect } from "next/navigation";
import { LogOut, ShieldAlert } from "lucide-react";
import { auth, signOut } from "@/auth";
import { getSessionStudentId } from "@/lib/lms/portal-queries";
import { hasValidConsent } from "@/lib/lms/consent";

export const dynamic = "force-dynamic";

// 🚧 Trang chặn HV chưa thành niên CHƯA có đồng ý phụ huynh (S5, AC-11, R-JL-STUDENT-PII-01).
// NẰM NGOÀI group (student) → KHÔNG render dashboard/queries dữ liệu lớp (chống lộ dữ liệu qua
// RSC payload khi minor chưa đủ điều kiện). Layout (student) redirect tới đây nếu chặn.
// Phòng hờ: nếu vào nhầm trang này khi ĐÃ đủ điều kiện → đẩy về /portal.
//
// 🗣️ Bình dân: học viên chưa đủ 18 và chưa có đồng ý phụ huynh chỉ thấy MÀN HÌNH NÀY (không tải
//    bất kỳ dữ liệu lớp nào), kèm lời nhắn liên hệ giảng viên.

export default async function ConsentRequiredPage() {
  const studentId = await getSessionStudentId();
  if (!studentId) redirect("/portal/login");

  const session = await auth();
  const isMinor = session?.isMinor === true;

  // Không phải minor, hoặc đã có đồng ý hợp lệ → không cần chặn, về portal.
  if (!isMinor || (await hasValidConsent(studentId, true))) {
    redirect("/portal");
  }

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/portal/login" });
  }

  return (
    <div className="portal">
      <main className="portal-main">
        <div className="card portal-consent-gate">
          <ShieldAlert strokeWidth={2} aria-hidden className="portal-consent-ic" />
          <h1>Cần phụ huynh đồng ý</h1>
          <p className="sub">
            Tài khoản của bạn được đánh dấu là học viên chưa thành niên. Theo quy định bảo vệ dữ
            liệu, bạn cần có sự đồng ý của phụ huynh/người giám hộ trước khi vào lớp.
          </p>
          <p className="sub">Vui lòng liên hệ giảng viên để hoàn tất bước đồng ý này.</p>
          <form action={doSignOut}>
            <button type="submit" className="btn line">
              <LogOut strokeWidth={2} aria-hidden />
              Đăng xuất
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
