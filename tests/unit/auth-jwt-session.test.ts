import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JWT } from "next-auth/jwt";
import { authConfig } from "@/auth.config";

// ADR-005 3a §7.3 — jwt / session callback: vai trò, hạn tuyệt đối phiên học viên, tối thiểu hoá PII.
// 🗣️ Bình dân: kiểm "thẻ ra vào" được phát đúng người, đúng quyền, và hết hạn đúng lúc.

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 13, 3, 0, 0);

type JwtFn = (p: { token: JWT; user?: Record<string, unknown> }) => JWT | null;
type SessionFn = (p: { session: Record<string, unknown>; token: JWT }) => Record<string, unknown>;
const jwt = authConfig.callbacks.jwt as unknown as JwtFn;
const session = authConfig.callbacks.session as unknown as SessionFn;

const CLOUD = { NODE_ENV: "production", AUTH_GOOGLE_ID: "gid", OWNER_EMAIL: "owner@x.vn" };
const useEnv = (e: Record<string, string>) => Object.entries(e).forEach(([k, v]) => vi.stubEnv(k, v));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

const google = { name: "Tên Google", email: "x@gmail.com", picture: "https://img", sub: "g1" } as JWT;

describe("jwt — lúc đăng nhập", () => {
  it("học viên: có studentId, accessCodeId, loginAt; không mang tên/email/ảnh", () => {
    useEnv(CLOUD);
    const t = jwt({ token: { ...google }, user: { studentId: "s1", lmsUserId: "u1", isMinor: true, accessCodeId: "c1" } });
    expect(t).toMatchObject({ role: "student", studentId: "s1", lmsUserId: "u1", isMinor: true, accessCodeId: "c1", loginAt: T0 });
    expect(t).not.toHaveProperty("name");
    expect(t).not.toHaveProperty("email");
    expect(t).not.toHaveProperty("picture");
  });

  it("owner: email trùng OWNER_EMAIL (không phân biệt hoa thường, khoảng trắng)", () => {
    useEnv(CLOUD);
    const t = jwt({ token: { ...google }, user: { email: " Owner@X.vn " } });
    expect(t).toMatchObject({ role: "owner", studentId: undefined, accessCodeId: undefined });
  });

  it("email lạ ở cloud → không tạo phiên", () => {
    useEnv(CLOUD);
    expect(jwt({ token: { ...google }, user: { email: "nguoila@gmail.com" } })).toBeNull();
  });

  it("production thiếu cấu hình owner + không phải học viên → không tạo phiên", () => {
    useEnv({ NODE_ENV: "production", AUTH_GOOGLE_ID: "gid", OWNER_EMAIL: "" });
    expect(jwt({ token: { ...google }, user: { email: "owner@x.vn" } })).toBeNull();
  });

  it("máy local (owner-auth tắt) giữ hành vi dev cũ", () => {
    useEnv({ NODE_ENV: "development", AUTH_GOOGLE_ID: "", OWNER_EMAIL: "" });
    expect(jwt({ token: {}, user: {} })).toMatchObject({ role: "owner" });
  });
});

describe("jwt — các lần đọc phiên sau", () => {
  const student = (loginAt?: number) => ({ role: "student", studentId: "s1", ...(loginAt !== undefined ? { loginAt } : {}) }) as JWT;

  it("học viên trong hạn 30 ngày giữ phiên; quá hạn 1 ms thì huỷ", () => {
    useEnv(CLOUD);
    vi.setSystemTime(T0 + 29 * DAY);
    expect(jwt({ token: student(T0) })).toMatchObject({ studentId: "s1" });
    vi.setSystemTime(T0 + 30 * DAY + 1);
    expect(jwt({ token: student(T0) })).toBeNull();
  });

  it("phiên cũ chưa có loginAt: bắt đầu đếm từ bây giờ, không huỷ (V1)", () => {
    useEnv(CLOUD);
    expect(jwt({ token: student() })).toMatchObject({ studentId: "s1", loginAt: T0 });
  });

  it("owner không có hạn tuyệt đối", () => {
    useEnv(CLOUD);
    vi.setSystemTime(T0 + 400 * DAY);
    expect(jwt({ token: { role: "owner" } as JWT })).toMatchObject({ role: "owner" });
  });
});

describe("session", () => {
  it("chỉ chép danh tính tối thiểu từ token", () => {
    const s = session({
      session: { user: {}, expires: "x" },
      token: { role: "student", studentId: "s1", lmsUserId: "u1", isMinor: false, accessCodeId: "c1", loginAt: T0 } as JWT,
    });
    expect(s).toMatchObject({ role: "student", studentId: "s1", lmsUserId: "u1", isMinor: false, accessCodeId: "c1" });
    expect(s).not.toHaveProperty("loginAt");
  });
});
