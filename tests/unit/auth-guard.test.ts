import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ADR-005 3a §7.6 — người gác cửa phía server: requireOwner / denyIfNotOwner / getOwnerSession.
// 🗣️ Bình dân: kiểm lớp khoá thứ hai, khi lỡ cổng ngoài (middleware) có sơ suất.

const h = vi.hoisted(() => ({ session: null as null | Record<string, unknown> }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => h.session) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const ENVS = {
  L: { NODE_ENV: "development", AUTH_GOOGLE_ID: "", OWNER_EMAIL: "" },
  C: { NODE_ENV: "production", AUTH_GOOGLE_ID: "gid", OWNER_EMAIL: "owner@x.vn" },
  M1: { NODE_ENV: "production", AUTH_GOOGLE_ID: "gid", OWNER_EMAIL: "" },
  M2: { NODE_ENV: "production", AUTH_GOOGLE_ID: "", OWNER_EMAIL: "owner@x.vn" },
};
const useEnv = (k: keyof typeof ENVS) => Object.entries(ENVS[k]).forEach(([n, v]) => vi.stubEnv(n, v));

let guard: typeof import("@/lib/auth-guard");
let authMock: ReturnType<typeof vi.fn>;
beforeEach(async () => {
  guard = await import("@/lib/auth-guard");
  authMock = (await import("@/auth")).auth as unknown as ReturnType<typeof vi.fn>;
  authMock.mockClear();
  h.session = null;
});
afterEach(() => vi.unstubAllEnvs());

const status = async (r: Response | null) => (r ? { status: r.status, body: await r.json() } : null);

describe("production thiếu cấu hình owner → chặn (fail-closed)", () => {
  it.each(["M1", "M2"] as const)("%s", async (env) => {
    useEnv(env);
    h.session = { role: "owner" };
    await expect(guard.requireOwner()).rejects.toThrow("REDIRECT:/login?error=Configuration");
    expect(await status(await guard.denyIfNotOwner())).toEqual({ status: 503, body: { error: "server_misconfigured" } });
  });
});

describe("máy local (owner-auth tắt) → mở, không hỏi phiên", () => {
  it("requireOwner / denyIfNotOwner / getOwnerSession", async () => {
    useEnv("L");
    await expect(guard.requireOwner()).resolves.toBeUndefined();
    expect(await guard.denyIfNotOwner()).toBeNull();
    expect(await guard.getOwnerSession()).toBeNull();
    expect(authMock).not.toHaveBeenCalled();
  });
});

describe("cloud (owner-auth bật)", () => {
  it("owner được qua", async () => {
    useEnv("C");
    h.session = { role: "owner" };
    await expect(guard.requireOwner()).resolves.toBeUndefined();
    expect(await guard.denyIfNotOwner()).toBeNull();
    expect(await guard.getOwnerSession()).toEqual({ role: "owner" });
  });

  it.each([
    ["học viên", { role: "student", studentId: "s1" }],
    ["chưa đăng nhập", null],
    ["object lỗi cấu hình", { message: "Configuration" }],
  ])("%s bị chặn", async (_n, s) => {
    useEnv("C");
    h.session = s as Record<string, unknown> | null;
    await expect(guard.requireOwner()).rejects.toThrow("REDIRECT:/login?error=WrongRole");
    expect(await status(await guard.denyIfNotOwner())).toEqual({ status: 401, body: { error: "unauthorized" } });
    expect(await guard.getOwnerSession()).toBeNull();
  });
});
