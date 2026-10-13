import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// ADR-005 3e — verifyAccessCode/issueAccessCode trên libSQL trong bộ nhớ, có bảng auth_throttle:
// bộ chặn lưu bền, cấp mã nguyên tử (createdAt tăng ngặt), unique index Gmail.
// 🗣️ Bình dân: thử đăng nhập bằng mã thật trên một DB giả, xem khoá đúng lúc và mã cũ mất hiệu lực.

vi.hoisted(() => {
  process.env.LMS_DATABASE_URL = ":memory:";
  delete process.env.LMS_DATABASE_AUTH_TOKEN;
  process.env.AUTH_SECRET = "test-secret-3e";
  process.env.LMS_INDEX_KEY = "11".repeat(32);
  process.env.LMS_ENCRYPTION_KEY = "22".repeat(32);
});
vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));

import { eq } from "drizzle-orm";
import { lmsDb, lmsLibsql } from "@/db/lms/client";
import { lmsUser } from "@/db/lms/schema";
import { ACCESS_CODE_POLICY, issueAccessCode, verifyAccessCode } from "@/lib/lms/access-code";
import { isUniqueViolation } from "@/lib/lms/db-errors";
import { hashThrottleKey } from "@/lib/lms/login-throttle";
import { linkVerifiedGoogleEmail } from "@/lib/lms/portal-queries";

const DDL = `
CREATE TABLE lms_user (
  id TEXT PRIMARY KEY, student_id TEXT NOT NULL, person_id TEXT, auth_provider TEXT NOT NULL DEFAULT 'credentials',
  auth_subject TEXT, auth_subject_index TEXT, email TEXT, email_index TEXT, is_minor INTEGER NOT NULL DEFAULT 0,
  guardian_contact TEXT, status TEXT NOT NULL DEFAULT 'active', created_at INTEGER NOT NULL, last_login_at INTEGER
);
CREATE TABLE access_code (
  id TEXT PRIMARY KEY, lms_user_id TEXT NOT NULL, code_hash TEXT NOT NULL, created_at INTEGER NOT NULL,
  expires_at INTEGER, used_at INTEGER, attempt_count INTEGER NOT NULL DEFAULT 0, locked_until INTEGER
);
CREATE TABLE auth_throttle (key_hash TEXT NOT NULL, window_start INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (key_hash, window_start));
CREATE UNIQUE INDEX ux_lms_user_email_index ON lms_user(email_index) WHERE email_index IS NOT NULL;`;

const T0 = Date.UTC(2026, 9, 14, 3, 0, 0);
const WRONG = "ZZZZ-ZZZZ";

beforeAll(async () => {
  await lmsLibsql.executeMultiple(DDL);
});
beforeEach(async () => {
  await lmsLibsql.executeMultiple("DELETE FROM lms_user; DELETE FROM access_code; DELETE FROM auth_throttle;");
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});
afterEach(() => vi.useRealTimers());

describe("verifyAccessCode — bộ chặn lưu bền", () => {
  it("đúng mã → vào được, và không tốn lượt", async () => {
    const { code } = await issueAccessCode("s1");
    for (let i = 0; i < ACCESS_CODE_POLICY.MAX_ATTEMPTS + 5; i++) {
      const r = await verifyAccessCode(code, { clientKey: "ip-lop" });
      expect(r && "studentId" in r ? r.studentId : r).toBe("s1");
    }
  });

  it("sai quá ngưỡng → nơi đó bị chặn (kể cả mã đúng); nơi khác vẫn vào", async () => {
    const { code } = await issueAccessCode("s1");
    for (let i = 0; i < ACCESS_CODE_POLICY.MAX_ATTEMPTS; i++) {
      expect(await verifyAccessCode(WRONG, { clientKey: "ip-xau" })).toBeNull();
    }
    expect(await verifyAccessCode(WRONG, { clientKey: "ip-xau" })).toEqual({ blocked: true });
    expect(await verifyAccessCode(code, { clientKey: "ip-xau" })).toEqual({ blocked: true });
    const ok = await verifyAccessCode(code, { clientKey: "ip-tot" });
    expect(ok && "studentId" in ok ? ok.studentId : ok).toBe("s1");
  });

  it("bắn song song không lách được ngưỡng", async () => {
    const n = ACCESS_CODE_POLICY.MAX_ATTEMPTS + 10;
    const rs = await Promise.all(Array.from({ length: n }, () => verifyAccessCode(WRONG, { clientKey: "ip-ban" })));
    expect(rs.filter((r) => r === null).length).toBe(ACCESS_CODE_POLICY.MAX_ATTEMPTS);
  });

  it("không lưu IP thô — khoá là HMAC từ AUTH_SECRET", async () => {
    await verifyAccessCode(WRONG, { clientKey: "203.0.113.9" });
    const keys = (await lmsLibsql.execute("SELECT key_hash FROM auth_throttle")).rows.map((r) => String(r.key_hash));
    expect(keys.some((k) => k.includes("203.0.113"))).toBe(false);
    expect(keys).toContain(hashThrottleKey("203.0.113.9", "test-secret-3e"));
  });

  it("bị dồn dập vượt trần chung: học viên mới gõ đúng vẫn vào, nơi đã sai nhiều bị chặn (audit M1)", async () => {
    const { code } = await issueAccessCode("s1");
    const { MAX_ATTEMPTS, GLOBAL_MAX_ATTEMPTS, FLOOD_MAX_ATTEMPTS } = ACCESS_CODE_POLICY;
    for (let ip = 0; ip < GLOBAL_MAX_ATTEMPTS / MAX_ATTEMPTS; ip++) {
      for (let i = 0; i < MAX_ATTEMPTS; i++) await verifyAccessCode(WRONG, { clientKey: `198.51.100.${ip}` });
    }
    const ok = await verifyAccessCode(code, { clientKey: "192.0.2.50" });
    expect(ok && "studentId" in ok ? ok.studentId : ok).toBe("s1");
    for (let i = 0; i < FLOOD_MAX_ATTEMPTS; i++) expect(await verifyAccessCode(WRONG, { clientKey: "192.0.2.60" })).toBeNull();
    expect(await verifyAccessCode(code, { clientKey: "192.0.2.60" })).toEqual({ blocked: true });
  });
});

describe("issueAccessCode — cấp mã nguyên tử", () => {
  it("cấp lại trong CÙNG 1 ms: mã mới có createdAt lớn hơn, mã cũ hết hiệu lực", async () => {
    const first = await issueAccessCode("s1");
    const second = await issueAccessCode("s1");
    const rows = await lmsLibsql.execute({
      sql: "SELECT id, created_at, expires_at FROM access_code WHERE id IN (?, ?)",
      args: [first.accessCodeId, second.accessCodeId],
    });
    const byId = Object.fromEntries(rows.rows.map((r) => [String(r.id), r]));
    expect(Number(byId[second.accessCodeId].created_at)).toBeGreaterThan(Number(byId[first.accessCodeId].created_at));
    expect(Number(byId[first.accessCodeId].expires_at)).toBeLessThan(T0);
    expect(await verifyAccessCode(first.code, { clientKey: "ip" })).toBeNull();
    const ok = await verifyAccessCode(second.code, { clientKey: "ip" });
    expect(ok && "accessCodeId" in ok ? ok.accessCodeId : ok).toBe(second.accessCodeId);
  });
});

describe("một Gmail một học viên (unique index)", () => {
  it("ghi trùng email_index → nhận ra là vi phạm UNIQUE (qua lớp bọc của drizzle)", async () => {
    await lmsDb.insert(lmsUser).values({ id: "u1", studentId: "s1", emailIndex: "idx-a", createdAt: T0 });
    await lmsDb.insert(lmsUser).values({ id: "u2", studentId: "s2", createdAt: T0 });
    const err = await lmsDb
      .update(lmsUser)
      .set({ emailIndex: "idx-a" })
      .where(eq(lmsUser.id, "u2"))
      .then(() => null, (e: unknown) => e);
    expect(err).not.toBeNull();
    expect(isUniqueViolation(err)).toBe(true);
    expect(isUniqueViolation(new Error("khác"))).toBe(false);
    // Dạng lỗi qua Turso HTTP: mã chung SQLITE_CONSTRAINT, chỉ thông báo nói rõ UNIQUE.
    const remote = { code: "SQLITE_CONSTRAINT", message: "SQLITE_CONSTRAINT: UNIQUE constraint failed: lms_user.email_index" };
    expect(isUniqueViolation(new Error("Failed query", { cause: remote }))).toBe(true);
    expect(isUniqueViolation({ code: "SQLITE_CONSTRAINT", message: "NOT NULL constraint failed: lms_user.id" })).toBe(false);
  });

  it("liên kết Gmail: học viên lỡ có 2 hàng lms_user vẫn liên kết được; người khác giành → taken (audit L6)", async () => {
    await lmsDb.insert(lmsUser).values({ id: "u1a", studentId: "s1", createdAt: T0 });
    await lmsDb.insert(lmsUser).values({ id: "u1b", studentId: "s1", createdAt: T0 });
    await lmsDb.insert(lmsUser).values({ id: "u2", studentId: "s2", createdAt: T0 });
    expect(await linkVerifiedGoogleEmail("s1", "hv@example.test", "owner@example.test")).toEqual({ ok: true });
    const linked = await lmsDb.select({ id: lmsUser.id }).from(lmsUser).where(eq(lmsUser.studentId, "s1"));
    const withEmail = (await lmsLibsql.execute("SELECT id FROM lms_user WHERE email_index IS NOT NULL")).rows;
    expect(linked.length).toBe(2);
    expect(withEmail.length).toBe(1);
    expect(await linkVerifiedGoogleEmail("s2", "HV@example.test", "owner@example.test")).toEqual({ ok: false, reason: "taken" });
  });

  it("nhiều học viên chưa gắn Gmail (NULL) không vướng ràng buộc", async () => {
    await lmsDb.insert(lmsUser).values({ id: "u1", studentId: "s1", createdAt: T0 });
    await lmsDb.insert(lmsUser).values({ id: "u2", studentId: "s2", createdAt: T0 });
    const n = await lmsLibsql.execute("SELECT COUNT(*) AS n FROM lms_user WHERE email_index IS NULL");
    expect(Number(n.rows[0].n)).toBe(2);
  });
});
