import { afterEach, describe, expect, it, vi } from "vitest";
import { authConfig } from "@/auth.config";

// ADR-005 3a §7.2 — ma trận cổng middleware `authorized()` theo môi trường × vai trò × đường dẫn.
// Ghi lại HÀNH VI HIỆN TẠI để bước nâng Next 16 (middleware → proxy) không làm lệch một ô nào.
//
// 🗣️ Bình dân: bảng "ai được vào cửa nào, trong hoàn cảnh nào". Ô nào đổi màu là test báo ngay.

type Outcome = true | false | { status: number; location?: string; body?: unknown };

const ENVS = {
  L: { NODE_ENV: "development", AUTH_GOOGLE_ID: "", OWNER_EMAIL: "" }, // máy local, owner-auth tắt
  C: { NODE_ENV: "production", AUTH_GOOGLE_ID: "gid", OWNER_EMAIL: "owner@x.vn" }, // cloud, owner-auth bật
  M1: { NODE_ENV: "production", AUTH_GOOGLE_ID: "gid", OWNER_EMAIL: "" }, // production thiếu OWNER_EMAIL
  M2: { NODE_ENV: "production", AUTH_GOOGLE_ID: "", OWNER_EMAIL: "owner@x.vn" }, // production thiếu Google
  D: { NODE_ENV: "development", AUTH_GOOGLE_ID: "gid", OWNER_EMAIL: "owner@x.vn" }, // dev có bật owner-auth
} as const;
type EnvKey = keyof typeof ENVS;

const ROLES = {
  anon: null,
  owner: { role: "owner" },
  student: { role: "student", studentId: "s1" },
  broken: { message: "Configuration error" }, // object lỗi khi cấu hình hỏng (GHSA-8fpg) — phải như chưa đăng nhập
  weird: { role: "admin" },
} as const;
type RoleKey = keyof typeof ROLES;

function useEnv(k: EnvKey) {
  for (const [name, value] of Object.entries(ENVS[k])) vi.stubEnv(name, value);
}

async function run(path: string, role: RoleKey): Promise<Outcome> {
  const authorized = authConfig.callbacks.authorized as unknown as (p: {
    auth: unknown;
    request: { nextUrl: URL };
  }) => boolean | Response;
  const r = authorized({ auth: ROLES[role], request: { nextUrl: new URL(path, "https://jl.test") } });
  if (typeof r === "boolean") return r;
  const location = r.headers.get("location") ?? undefined;
  const body = location ? undefined : await r.json().catch(() => undefined);
  return { status: r.status, ...(location ? { location: new URL(location).pathname + new URL(location).search } : {}), ...(body ? { body } : {}) };
}

const redirect = (q: string) => ({ status: 302, location: `/login?error=${q}` });
const R401 = { status: 401, body: { error: "unauthorized" } };
const R503 = { status: 503, body: { error: "server_misconfigured" } };

afterEach(() => vi.unstubAllEnvs());

describe("authorized() — khu cá nhân của chủ", () => {
  const cases: [EnvKey, RoleKey, Outcome][] = [
    ["L", "anon", true],
    ["C", "anon", redirect("SignedOut")],
    ["C", "student", redirect("WrongRole")],
    ["C", "owner", true],
    ["C", "broken", redirect("SignedOut")],
    ["C", "weird", redirect("WrongRole")],
    ["M1", "anon", redirect("Configuration")],
    ["M1", "owner", redirect("Configuration")], // fail-closed kể cả có token owner
    ["M1", "student", redirect("Configuration")],
    ["M2", "owner", redirect("Configuration")],
    ["D", "anon", redirect("SignedOut")],
  ];
  for (const path of ["/today", "/", "/teaching/classes", "/settings"]) {
    it.each(cases)(`${path} — %s / %s`, async (env, role, want) => {
      useEnv(env);
      expect(await run(path, role)).toEqual(want);
    });
  }

  it.each<[EnvKey, RoleKey, Outcome]>([
    ["L", "anon", true],
    ["C", "anon", R401],
    ["C", "student", R401],
    ["C", "owner", true],
    ["C", "broken", R401],
    ["M1", "owner", R503],
    ["M2", "anon", R503],
  ])("API của chủ /api/personal/tasks — %s / %s", async (env, role, want) => {
    useEnv(env);
    expect(await run("/api/personal/tasks", role)).toEqual(want);
  });
});

describe("authorized() — cổng học viên", () => {
  it.each<[EnvKey, RoleKey, boolean]>([
    ["L", "anon", false],
    ["C", "anon", false],
    ["C", "student", true],
    ["C", "owner", false], // owner không vào cổng học viên
    ["C", "broken", false],
    ["M1", "student", true], // học viên không bị phạt khi chủ cấu hình sai
  ])("/portal và /portal/grades — %s / %s", async (env, role, want) => {
    useEnv(env);
    expect(await run("/portal", role)).toBe(want);
    expect(await run("/portal/grades", role)).toBe(want);
  });

  it.each<EnvKey>(["L", "C", "M1", "M2", "D"])("/portal/login luôn mở — %s", async (env) => {
    useEnv(env);
    for (const role of Object.keys(ROLES) as RoleKey[]) expect(await run("/portal/login", role)).toBe(true);
  });

  it.each<[EnvKey, RoleKey, Outcome]>([
    ["C", "student", true],
    ["C", "anon", R401],
    ["M1", "student", true],
    ["M1", "anon", R503],
  ])("API học viên /api/lms/submission — %s / %s", async (env, role, want) => {
    useEnv(env);
    expect(await run("/api/lms/submission", role)).toEqual(want);
  });
});

describe("authorized() — danh sách công khai không bị nới", () => {
  const PUBLIC = ["/login", "/portal/login", "/api/auth", "/api/auth/session", "/api/auth/callback/google", "/share/abc", "/api/library/file", "/api/library/file/abc"];
  const TRAPS = ["/api/library/file-admin", "/api/authx", "/share", "/sharex", "/login/x", "/loginx", "/ui-kit", "/api/library/upload", "/api/personal/x", "/today"];

  it("ở cloud, chưa đăng nhập: đúng các đường dẫn công khai đã định", async () => {
    useEnv("C");
    for (const p of PUBLIC) expect([p, await run(p, "anon")]).toEqual([p, true]);
    for (const p of TRAPS) expect([p, await run(p, "anon")]).not.toEqual([p, true]);
  });

  it("đường dẫn công khai vẫn mở khi production thiếu cấu hình (fail-closed)", async () => {
    useEnv("M1");
    for (const p of PUBLIC) expect([p, await run(p, "anon")]).toEqual([p, true]);
  });

  it("/ui-kit chỉ mở ở dev", async () => {
    useEnv("D");
    expect(await run("/ui-kit", "anon")).toBe(true);
    useEnv("C");
    expect(await run("/ui-kit", "anon")).toEqual(redirect("SignedOut"));
  });

  it("/portalx bị đòi vai trò học viên (chặt hơn — không được 'sửa' thành lỏng)", async () => {
    useEnv("C");
    expect(await run("/portalx", "anon")).toBe(false);
  });
});
