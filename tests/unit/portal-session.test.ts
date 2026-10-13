import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// ADR-005 3a §7.5 — getSessionStudentId(): nguồn studentId duy nhất, kiểm thêm phía server
// (status active, mã của phiên chưa bị thu hồi bởi mã mới hơn). Chạy trên libSQL trong bộ nhớ.
// 🗣️ Bình dân: thẻ cũ còn trong túi nhưng giảng viên đã cấp thẻ mới hoặc khoá tài khoản → không vào được.

vi.hoisted(() => {
  process.env.LMS_DATABASE_URL = ":memory:";
  delete process.env.LMS_DATABASE_AUTH_TOKEN;
});
const h = vi.hoisted(() => ({ session: null as null | Record<string, unknown> }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => h.session) }));

import { lmsLibsql } from "@/db/lms/client";
import { getSessionStudentId } from "@/lib/lms/portal-queries";
import { issueAccessCode } from "@/lib/lms/access-code";

const DDL = `
CREATE TABLE lms_user (
  id TEXT PRIMARY KEY, student_id TEXT NOT NULL, person_id TEXT, auth_provider TEXT NOT NULL DEFAULT 'credentials',
  auth_subject TEXT, auth_subject_index TEXT, email TEXT, email_index TEXT, is_minor INTEGER NOT NULL DEFAULT 0,
  guardian_contact TEXT, status TEXT NOT NULL DEFAULT 'active', created_at INTEGER NOT NULL, last_login_at INTEGER
);
CREATE TABLE access_code (
  id TEXT PRIMARY KEY, lms_user_id TEXT NOT NULL, code_hash TEXT NOT NULL, created_at INTEGER NOT NULL,
  expires_at INTEGER, used_at INTEGER, attempt_count INTEGER NOT NULL DEFAULT 0, locked_until INTEGER
);`;

const T0 = Date.UTC(2026, 9, 13, 3, 0, 0);

async function userRow(studentId: string, status = "active") {
  await lmsLibsql.execute({
    sql: "INSERT INTO lms_user (id, student_id, status, created_at) VALUES (?, ?, ?, ?)",
    args: [`u-${studentId}`, studentId, status, T0],
  });
}
async function codeRow(id: string, studentId: string, createdAt: number, expiresAt: number | null) {
  await lmsLibsql.execute({
    sql: "INSERT INTO access_code (id, lms_user_id, code_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
    args: [id, `u-${studentId}`, `h-${id}`, createdAt, expiresAt],
  });
}

beforeAll(async () => {
  await lmsLibsql.executeMultiple(DDL);
});
beforeEach(async () => {
  await lmsLibsql.executeMultiple("DELETE FROM lms_user; DELETE FROM access_code;");
  h.session = null;
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});
afterEach(() => vi.useRealTimers());

describe("getSessionStudentId", () => {
  it("không có phiên, hoặc phiên owner → null", async () => {
    expect(await getSessionStudentId()).toBeNull();
    h.session = { role: "owner" };
    expect(await getSessionStudentId()).toBeNull();
  });

  it("học viên active → studentId; không có lms_user hoặc bị khoá → null", async () => {
    h.session = { role: "student", studentId: "s1" };
    expect(await getSessionStudentId()).toBeNull(); // chưa có lms_user
    await userRow("s1");
    expect(await getSessionStudentId()).toBe("s1");
    await lmsLibsql.execute("UPDATE lms_user SET status = 'disabled' WHERE student_id = 's1'");
    expect(await getSessionStudentId()).toBeNull();
  });

  it("phiên bằng mã: mã không tồn tại → null; mã mới hơn đã được cấp → null", async () => {
    await userRow("s1");
    h.session = { role: "student", studentId: "s1", accessCodeId: "c-old" };
    expect(await getSessionStudentId()).toBeNull(); // mã không tồn tại
    await codeRow("c-old", "s1", T0 - 1000, T0 + 1000);
    expect(await getSessionStudentId()).toBe("s1");
    await codeRow("c-new", "s1", T0, T0 + 1000);
    expect(await getSessionStudentId()).toBeNull(); // cấp mã mới = thu hồi phiên cũ
  });

  it("mã hết hạn TỰ NHIÊN nhưng không có mã mới hơn → vẫn vào được (V1)", async () => {
    await userRow("s1");
    await codeRow("c1", "s1", T0 - 40 * 86_400_000, T0 - 10 * 86_400_000);
    h.session = { role: "student", studentId: "s1", accessCodeId: "c1" };
    expect(await getSessionStudentId()).toBe("s1");
  });

  it("mã mới của học viên KHÁC không ảnh hưởng", async () => {
    await userRow("s1");
    await userRow("s2");
    await codeRow("c1", "s1", T0 - 1000, null);
    await codeRow("c2", "s2", T0, null);
    h.session = { role: "student", studentId: "s1", accessCodeId: "c1" };
    expect(await getSessionStudentId()).toBe("s1");
  });

  it("phiên Gmail (không có accessCodeId) + active → studentId", async () => {
    await userRow("s1");
    h.session = { role: "student", studentId: "s1" };
    expect(await getSessionStudentId()).toBe("s1");
  });

  it("tương tác thật: cấp mã lần 2 làm phiên của mã lần 1 mất hiệu lực", async () => {
    await userRow("s1");
    const first = await issueAccessCode("s1");
    h.session = { role: "student", studentId: "s1", accessCodeId: first.accessCodeId };
    expect(await getSessionStudentId()).toBe("s1");
    vi.setSystemTime(T0 + 1);
    await issueAccessCode("s1");
    expect(await getSessionStudentId()).toBeNull();
  });
});
