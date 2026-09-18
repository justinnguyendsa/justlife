import { lmsDb, lmsLibsql } from "./client";
import { eq } from "drizzle-orm";
import { tcClass, tcStudent, lmsUser, tcCourse, lmsPerson, enrollment } from "./schema";
import { genId } from "@/lib/id";

// Safe encrypt/index: nếu có key → mã hóa; nếu không (S1 local) → plaintext.
function safeEncrypt(value: string | null | undefined): string | null {
  if (value == null) return null;
  try {
    const { encryptFieldOpt } = require("@/lib/lms/crypto");
    return encryptFieldOpt(value) ?? value;
  } catch {
    return value; // no key → plaintext
  }
}
function safeBlindIndex(value: string): string | null {
  try {
    const { blindIndex } = require("@/lib/lms/crypto");
    return blindIndex(value);
  } catch {
    return null; // no key → skip index
  }
}

// Safe decrypt: nếu là ciphertext v1 → giải mã; nếu plaintext (S1 local) → trả nguyên.
function safeDecrypt(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string" && value.startsWith("v1:")) {
    try {
      const { decryptFieldOpt } = require("@/lib/lms/crypto");
      return decryptFieldOpt(value);
    } catch {
      return value; // decrypt fail → return as-is
    }
  }
  return value;
}

// S0: Migration gộp danh tính (ADR-003 QĐ0). Idempotent, chạy 1 lần.
// Logic:
// 1. Lấy tất cả tc_student.
// 2. Gộp theo name (decrypted) → 1 lms_person / người.
// 3. Tạo enrollment (person × class).
// 4. Tạo tc_course mặc định cho mỗi tc_class.
// 5. Backfill tc_student.personId, tc_class.courseId, lms_user.personId.
// Dry-run: set DRY_RUN=1 để chỉ đếm, không ghi.

const DRY_RUN = process.env.DRY_RUN === "1";

async function main() {
  // 🛡️ P-LMS-0: CHẶN chạy ở production (chạy thủ công, có kiểm soát)
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_S0_MIGRATION) {
    console.error("❌ Migration S0 cần ALLOW_S0_MIGRATION=1 ở production.");
    process.exit(1);
  }

  console.log(DRY_RUN ? "📝 DRY RUN (không ghi)" : "⚡ LIVE RUN (sẽ ghi DB)");

  // 1. Lấy tất cả students
  const allStudents = await lmsDb.select().from(tcStudent);
  console.log(`Tổng tc_student: ${allStudents.length}`);

  // Skip if already migrated (idempotent check)
  const alreadyMigrated = allStudents.filter(s => s.personId != null);
  if (alreadyMigrated.length === allStudents.length && allStudents.length > 0) {
    console.log("✓ Đã migrate S0 rồi. Bỏ qua.");
    return;
  }

  // 2. Gộp theo tên (decrypted) → lms_person
  const personMap = new Map<string, { personId: string; name: string; email: string | null; isMinor: number }>(); // key = normalized name
  const studentToPersonId = new Map<string, string>(); // tc_student.id -> personId

  for (const s of allStudents) {
    if (s.personId) {
      studentToPersonId.set(s.id, s.personId);
      continue; // already backfilled
    }
    const rawName = safeDecrypt(s.name) ?? s.name;
    const key = rawName.toLowerCase().trim();
    if (!personMap.has(key)) {
      const pid = genId();
      personMap.set(key, {
        personId: pid,
        name: rawName,
        email: s.email ? (safeDecrypt(s.email) ?? s.email) : null,
        isMinor: 0, // will be updated from lms_user if exists
      });
    }
    studentToPersonId.set(s.id, personMap.get(key)!.personId);
  }

  console.log(`lms_person sẽ tạo: ${personMap.size}`);

  // 3. Check lms_user for isMinor info
  const allLmsUsers = await lmsDb.select().from(lmsUser);
  for (const u of allLmsUsers) {
    const pid = studentToPersonId.get(u.studentId);
    if (pid) {
      for (const [, person] of personMap) {
        if (person.personId === pid && u.isMinor === 1) {
          person.isMinor = 1;
        }
      }
    }
  }

  // 4. Tạo tc_course mặc định cho mỗi class
  const allClasses = await lmsDb.select().from(tcClass);
  const courseMap = new Map<string, string>(); // classId -> courseId
  const coursesToCreate: { id: string; title: string; classId: string }[] = [];

  for (const cls of allClasses) {
    if (cls.courseId) {
      courseMap.set(cls.id, cls.courseId);
      continue; // already has course
    }
    const courseId = genId();
    courseMap.set(cls.id, courseId);
    coursesToCreate.push({ id: courseId, title: cls.name, classId: cls.id });
  }

  console.log(`tc_course sẽ tạo: ${coursesToCreate.length}`);
  console.log(`enrollment sẽ tạo: ${studentToPersonId.size}`);

  if (DRY_RUN) {
    console.log("\n📝 Dry run xong. Chạy lại không có DRY_RUN=1 để ghi thật.");
    return;
  }

  // ===== WRITE =====
  const now = Date.now();

  // 5a. Insert lms_person
  for (const [, person] of personMap) {
    const emailIdx = person.email ? safeBlindIndex(person.email) : null;
    await lmsDb.insert(lmsPerson).values({
      id: person.personId,
      displayName: safeEncrypt(person.name) ?? person.name,
      email: person.email ? (safeEncrypt(person.email) ?? person.email) : null,
      emailIndex: emailIdx,
      isMinor: person.isMinor,
      status: "active",
      createdAt: now,
    });
  }
  console.log(`✓ Tạo ${personMap.size} lms_person`);

  // 5b. Insert tc_course + backfill tc_class.courseId
  for (const c of coursesToCreate) {
    await lmsDb.insert(tcCourse).values({
      id: c.id,
      title: c.title,
      slug: c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      status: "published",
      createdAt: now,
    });
    await lmsDb.update(tcClass).set({ courseId: c.id }).where(eq(tcClass.id, c.classId));
  }
  console.log(`✓ Tạo ${coursesToCreate.length} tc_course`);

  // 5c. Backfill tc_student.personId + create enrollment
  for (const s of allStudents) {
    const pid = studentToPersonId.get(s.id);
    if (!pid) continue;
    if (!s.personId) {
      await lmsDb.update(tcStudent).set({ personId: pid }).where(eq(tcStudent.id, s.id));
    }
    // Create enrollment (person x class)
    const cid = courseMap.get(s.classId);
    try {
      await lmsDb.insert(enrollment).values({
        id: genId(),
        personId: pid,
        classId: s.classId,
        courseId: cid ?? null,
        role: "student",
        status: "active",
        enrolledAt: s.createdAt,
      });
    } catch (e) {
      // UNIQUE constraint on (person_id, class_id) — skip duplicates
      if (!String(e).includes('UNIQUE constraint')) throw e;
    }
  }
  console.log(`✓ Backfill tc_student.personId + enrollment`);

  // 5d. Backfill lms_user.personId
  for (const u of allLmsUsers) {
    const pid = studentToPersonId.get(u.studentId);
    if (pid && !u.personId) {
      await lmsDb.update(lmsUser).set({ personId: pid }).where(eq(lmsUser.id, u.id));
    }
  }
  console.log(`✓ Backfill lms_user.personId`);

  console.log("\n✅ Migration S0 hoàn tất!");
}

main().catch(e => {
  console.error("Migration S0 fail:", e);
  process.exit(1);
});
