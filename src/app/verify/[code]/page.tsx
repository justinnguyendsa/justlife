import { lmsDb } from "@/db/lms/client";
import { tcCertificate, tcCourse, lmsPerson } from "@/db/lms/schema";
import { eq } from "drizzle-orm";

// /verify/[code] — trang tra cứu chứng chỉ CÔNG KHAI.
// CHỈ hiển: tên khóa + ngày + hợp lệ. KHÔNG lộ PII thừa (ADR-003 QĐ1.5).

function safeDecrypt(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string" && value.startsWith("v1:")) {
    try {
      const { decryptFieldOpt } = require("@/lib/lms/crypto");
      return decryptFieldOpt(value);
    } catch { return value; }
  }
  return value;
}

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const certs = await lmsDb.select().from(tcCertificate)
    .where(eq(tcCertificate.verifyCode, code)).limit(1);
  const cert = certs[0];

  if (!cert) {
    return (
      <main style={{ maxWidth: 600, margin: "80px auto", textAlign: "center", fontFamily: "system-ui" }}>
        <h1 style={{ color: "#e53e3e" }}>❌ Không tìm thấy chứng chỉ</h1>
        <p>Mã tra cứu không hợp lệ hoặc đã bị thu hồi.</p>
      </main>
    );
  }

  if (cert.revoked) {
    return (
      <main style={{ maxWidth: 600, margin: "80px auto", textAlign: "center", fontFamily: "system-ui" }}>
        <h1 style={{ color: "#e53e3e" }}>⚠️ Chứng chỉ đã bị thu hồi</h1>
        <p>Chứng chỉ này không còn hiệu lực.</p>
      </main>
    );
  }

  // Lấy tên khóa (không PII)
  const course = (await lmsDb.select({ title: tcCourse.title }).from(tcCourse)
    .where(eq(tcCourse.id, cert.courseId)).limit(1))[0];

  // Lấy tên người (giải mã nếu cần — chỉ hiển tên, không email)
  const person = (await lmsDb.select({ displayName: lmsPerson.displayName }).from(lmsPerson)
    .where(eq(lmsPerson.id, cert.personId)).limit(1))[0];
  const displayName = safeDecrypt(person?.displayName) ?? "Học viên";

  const issuedDate = new Date(cert.issuedAt).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <main style={{ maxWidth: 600, margin: "80px auto", textAlign: "center", fontFamily: "system-ui" }}>
      <div style={{ border: "2px solid #38a169", borderRadius: 12, padding: 40, background: "#f0fff4" }}>
        <h1 style={{ color: "#38a169", marginBottom: 8 }}>✅ Chứng chỉ hợp lệ</h1>
        <p style={{ fontSize: 18, fontWeight: 600, marginTop: 24 }}>{displayName}</p>
        <p style={{ color: "#4a5568" }}>đã hoàn thành khóa học</p>
        <p style={{ fontSize: 20, fontWeight: 700, color: "#2d3748" }}>{course?.title ?? "Khóa học"}</p>
        <p style={{ color: "#718096", marginTop: 16 }}>Ngày cấp: {issuedDate}</p>
        <p style={{ color: "#a0aec0", fontSize: 12, marginTop: 24 }}>Mã xác minh: {code}</p>
      </div>
    </main>
  );
}
