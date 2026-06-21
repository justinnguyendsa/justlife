import { eq } from "drizzle-orm";
import { lmsDb } from "./client";
import { tcClass, tcStudent, tcSession, tcAttendance, tcAssignment, tcGrade, lmsUser, accessCode, consentLog, accessAudit, tcSubmission } from "./schema";
import { genId } from "../../lib/id";
import { DEMO_CLASS_ID } from "./constants";
import { issueFixedAccessCodeForDev } from "../../lib/lms/access-code";
import { recordConsent } from "../../lib/lms/consent";

// ⚠ DEV ONLY — mã truy cập cố định để test đăng nhập cổng học viên ở local (dạng chuẩn XXXX-XXXX).
const DEV_ACCESS_CODE = "DEV1-2345"; // HV-A (Nguyễn Văn A) — đủ 18 + ĐÃ consent → vào portal OK
const DEV_MINOR_CODE = "DEV2-MINR"; // HV-B (Trần Thị B) — chưa thành niên + CHƯA consent → bị chặn gate

// Seed mẫu dạy học vào lms.db (DA01 + 5 HV + 1 buổi + điểm danh + 1 bài tập + 1 điểm).
// S1: PLAINTEXT (local) — mã hóa field định danh là stage sau (SPEC-P5a §6).
// classId cố định (DEMO_CLASS_ID) để giữ liên kết với lib_file.linkClassId bên personal.db (soft link, no FK chéo).

const now = Date.now();
const H = 3_600_000, D = 86_400_000;
const today0 = now - (now % D); // mốc 00:00 UTC gần nhất (đủ cho seed demo)

async function main() {
  // reset (idempotent) — thứ tự con → cha
  await lmsDb.delete(accessAudit); await lmsDb.delete(consentLog); await lmsDb.delete(tcSubmission);
  await lmsDb.delete(accessCode); await lmsDb.delete(lmsUser);
  await lmsDb.delete(tcGrade); await lmsDb.delete(tcAttendance); await lmsDb.delete(tcAssignment);
  await lmsDb.delete(tcSession); await lmsDb.delete(tcStudent); await lmsDb.delete(tcClass);

  const classId = DEMO_CLASS_ID;
  await lmsDb.insert(tcClass).values({ id: classId, name: "DA01 — Data Analysis cơ bản", term: "Khóa 12/2026", status: "active", createdAt: now });

  const sIds: string[] = [];
  for (const n of ["Nguyễn Văn A", "Trần Thị B", "Lê Văn C", "Phạm Thị D", "Hoàng Văn E"]) {
    const sid = genId(); sIds.push(sid);
    await lmsDb.insert(tcStudent).values({ id: sid, classId, name: n, createdAt: now });
  }

  const sessionId = genId();
  await lmsDb.insert(tcSession).values({ id: sessionId, classId, dateAt: today0 + 19 * H + 15 * 60_000, topic: "Buổi 5 — Pivot & VLOOKUP", createdAt: now });
  const att = ["present", "present", "absent", "present", "late"];
  for (let i = 0; i < sIds.length; i++) await lmsDb.insert(tcAttendance).values({ id: genId(), sessionId, studentId: sIds[i], status: att[i], markedAt: now });

  const asgId = genId();
  await lmsDb.insert(tcAssignment).values({ id: asgId, classId, title: "Bài tập buổi 5 — Làm sạch dữ liệu", dueAt: now + 2 * D, maxScore: 10, createdAt: now });
  await lmsDb.insert(tcGrade).values({ id: genId(), assignmentId: asgId, studentId: sIds[0], score: 9, feedback: "Làm tốt, trình bày rõ ràng. Cần chú thích thêm bước xử lý null.", gradedAt: now });

  console.log("✓ seed: DA01 + 5 HV + 1 buổi (điểm danh) + 1 bài tập + 1 điểm (lms.db)");

  // ⚠ DEV ONLY — cấp access-code cố định cho HV đầu tiên (sIds[0]) để test đăng nhập local.
  const dev = await issueFixedAccessCodeForDev(sIds[0], DEV_ACCESS_CODE);
  // HV-A: đủ 18 + ĐÃ đồng ý xử lý dữ liệu → vào portal bình thường (consent gate không chặn).
  await recordConsent({ studentId: sIds[0], isMinor: false, channel: "offline" });

  // ⚠ DEV ONLY — HV-B (sIds[1], Trần Thị B): CHƯA THÀNH NIÊN + CHƯA consent → để test consent gate.
  // Tạo lms_user + access-code, rồi đặt isMinor=1 (KHÔNG gọi recordConsent → không có consent_log
  // → hasValidConsent=false → portal layout chặn, hiện "Cần phụ huynh đồng ý").
  const devMinor = await issueFixedAccessCodeForDev(sIds[1], DEV_MINOR_CODE);
  await lmsDb.update(lmsUser).set({ isMinor: 1 }).where(eq(lmsUser.studentId, sIds[1]));

  console.log("──────────────────────────────────────────────");
  console.log("⚠ DEV ONLY — access-code đăng nhập cổng học viên (local):");
  console.log(`   [HV-A] code = ${dev.code}  · studentId = ${sIds[0]} (Nguyễn Văn A) · đủ 18 + ĐÃ consent → vào OK`);
  console.log(`   [HV-B] code = ${devMinor.code}  · studentId = ${sIds[1]} (Trần Thị B) · CHƯA thành niên + CHƯA consent → BỊ CHẶN (test gate)`);
  console.log("   Dùng ở /portal/login (provider 'access-code'). KHÔNG dùng ở production.");
  console.log("──────────────────────────────────────────────");
}

main().catch((e) => { console.error("seed lms fail:", e); process.exit(1); });
