import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ADR-005 3a §7.4 — signIn callback + authorize() của provider access-code, lấy từ config thật của
// src/auth.ts (mock NextAuth để bắt config, không sửa mã nguồn).
// 🗣️ Bình dân: thử từng kiểu người gõ cửa — học viên dùng mã, chủ, người lạ, học viên dùng Gmail,
//    học viên đang liên kết Gmail — xem cửa mở/đóng đúng chưa.

const h = vi.hoisted(() => ({
  cfg: null as null | { callbacks: Record<string, (...a: unknown[]) => unknown>; providers: Array<Record<string, unknown>> },
  jar: new Map<string, string>(),
  deletes: [] as unknown[],
  deleteThrows: false,
  rows: [] as Array<Record<string, unknown>>,
}));

vi.mock("next-auth", () => ({
  default: (c: unknown) => {
    h.cfg = c as typeof h.cfg;
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  },
  CredentialsSignin: class extends Error {
    code = "credentials";
  },
}));
vi.mock("next-auth/providers/credentials", () => ({ default: (c: object) => ({ id: "access-code", ...c }) }));
vi.mock("next-auth/providers/google", () => ({ default: (c: object) => ({ id: "google", ...c }) }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (h.jar.has(name) ? { name, value: h.jar.get(name) } : undefined),
    delete: (opts: unknown) => {
      h.deletes.push(opts);
      if (h.deleteThrows) throw new Error("readonly");
    },
  }),
}));
vi.mock("@/lib/lms/access-code", () => ({ verifyAccessCode: vi.fn() }));
vi.mock("@/lib/lms/portal-queries", () => ({ getSessionStudentId: vi.fn(), linkVerifiedGoogleEmail: vi.fn() }));
vi.mock("@/lib/lms/audit", () => ({ logAccess: vi.fn() }));
vi.mock("@/lib/lms/crypto", () => ({ blindIndex: (e: string) => `idx:${e}` }));
vi.mock("@/db/lms/client", () => ({
  lmsDb: { select: () => ({ from: () => ({ where: () => ({ limit: async () => h.rows }) }) }) },
}));

import { LINK_INTENT_COOKIE, signIntent } from "@/lib/lms/link-intent";
import { verifyAccessCode } from "@/lib/lms/access-code";
import { getSessionStudentId, linkVerifiedGoogleEmail } from "@/lib/lms/portal-queries";
import { logAccess } from "@/lib/lms/audit";

const SECRET = "test-secret-khong-dung-that";
const OWNER = "owner@x.vn";

let signIn: (p: { profile?: Record<string, unknown>; user?: Record<string, unknown> }) => Promise<unknown>;
let authorize: (credentials: unknown, request?: Request) => Promise<unknown>;

beforeEach(async () => {
  vi.stubEnv("AUTH_SECRET", SECRET);
  vi.stubEnv("AUTH_GOOGLE_ID", "gid");
  vi.stubEnv("AUTH_GOOGLE_SECRET", "gsecret");
  vi.stubEnv("OWNER_EMAIL", OWNER);
  vi.resetModules();
  await import("@/auth");
  signIn = h.cfg!.callbacks.signIn as typeof signIn;
  authorize = h.cfg!.providers.find((p) => p.id === "access-code")!.authorize as typeof authorize;
  h.jar.clear();
  h.deletes = [];
  h.deleteThrows = false;
  h.rows = [];
  vi.mocked(getSessionStudentId).mockReset();
  vi.mocked(linkVerifiedGoogleEmail).mockReset();
  vi.mocked(logAccess).mockReset();
  vi.mocked(verifyAccessCode).mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const google = (email: string, verified: boolean | "missing" = true) => ({
  profile: { email, ...(verified === "missing" ? {} : { email_verified: verified }) },
  user: { email } as Record<string, unknown>,
});
const withIntent = (studentId = "s1", now = Date.now()) => h.jar.set(LINK_INTENT_COOKIE, signIntent(studentId, now, SECRET));
const activeRow = { id: "u1", studentId: "s1", isMinor: 0, status: "active" };

describe("signIn — học viên dùng mã", () => {
  it("user có studentId → cho qua, không đụng phiếu liên kết", async () => {
    withIntent();
    expect(await signIn({ user: { studentId: "s1" } })).toBe(true);
    expect(h.deletes).toEqual([]);
  });
});

describe("signIn — chủ sở hữu (Google)", () => {
  it("email trùng (khác hoa thường, khoảng trắng) + đã xác minh → cho qua", async () => {
    expect(await signIn(google(" Owner@X.vn "))).toBe(true);
  });

  it("có phiếu liên kết sót lại → phiếu vẫn bị xoá, vẫn cho owner qua", async () => {
    withIntent();
    expect(await signIn(google(OWNER))).toBe(true);
    expect(h.deletes).toEqual([{ name: LINK_INTENT_COOKIE, path: "/api/auth" }]);
  });

  it("email_verified false → không thành owner", async () => {
    expect(await signIn(google(OWNER, false))).toBe(false);
  });
});

describe("signIn — người lạ / học viên dùng Gmail", () => {
  it("người lạ không khớp học viên nào → từ chối; log không chứa email", async () => {
    expect(await signIn(google("nguoila@gmail.com"))).toBe(false);
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).not.toContain("@");
    expect(logged).not.toContain("gmail");
  });

  it("đúng 1 học viên active khớp → cho qua và gắn danh tính vào user", async () => {
    h.rows = [activeRow];
    const p = google("hv@gmail.com");
    expect(await signIn(p)).toBe(true);
    expect(p.user).toMatchObject({ studentId: "s1", lmsUserId: "u1", isMinor: false });
  });

  it("2 hàng trùng index, hoặc học viên bị khoá → từ chối", async () => {
    h.rows = [activeRow, { ...activeRow, id: "u2", studentId: "s2" }];
    expect(await signIn(google("hv@gmail.com"))).toBe(false);
    h.rows = [{ ...activeRow, status: "disabled" }];
    expect(await signIn(google("hv@gmail.com"))).toBe(false);
  });
});

describe("signIn — đang liên kết Gmail (phiếu ý định)", () => {
  it("phiếu sai chữ ký / hết hạn → ?link=expired", async () => {
    h.jar.set(LINK_INTENT_COOKIE, "v1.s1.9999999999999.chu-ky-gia");
    expect(await signIn(google("hv@gmail.com"))).toBe("/portal/profile?link=expired");
    withIntent("s1", Date.now() - 10 * 60_000);
    expect(await signIn(google("hv@gmail.com"))).toBe("/portal/profile?link=expired");
  });

  it("email chưa được Google xác minh rõ ràng → ?link=invalid", async () => {
    withIntent();
    expect(await signIn(google("hv@gmail.com", "missing"))).toBe("/portal/profile?link=invalid");
  });

  it("phiên hiện tại không phải học viên trong phiếu → ?link=error, không gắn gì (H1)", async () => {
    withIntent("s1");
    vi.mocked(getSessionStudentId).mockResolvedValue("s9");
    expect(await signIn(google("hv@gmail.com"))).toBe("/portal/profile?link=error");
    vi.mocked(getSessionStudentId).mockResolvedValue(null);
    withIntent("s1");
    expect(await signIn(google("hv@gmail.com"))).toBe("/portal/profile?link=error");
    expect(linkVerifiedGoogleEmail).not.toHaveBeenCalled();
  });

  it("hợp lệ → gắn email, ghi audit, rồi đăng nhập vào đúng học viên", async () => {
    withIntent("s1");
    vi.mocked(getSessionStudentId).mockResolvedValue("s1");
    vi.mocked(linkVerifiedGoogleEmail).mockResolvedValue({ ok: true });
    h.rows = [activeRow];
    expect(await signIn(google("hv@gmail.com"))).toBe(true);
    expect(linkVerifiedGoogleEmail).toHaveBeenCalledWith("s1", "hv@gmail.com", OWNER);
    expect(logAccess).toHaveBeenCalledWith(expect.objectContaining({ actor: "s1", action: "link_gmail" }));
  });

  it("Gmail đã thuộc học viên khác → ?link=taken; lỗi khi gắn → ?link=error", async () => {
    withIntent("s1");
    vi.mocked(getSessionStudentId).mockResolvedValue("s1");
    vi.mocked(linkVerifiedGoogleEmail).mockResolvedValue({ ok: false, reason: "taken" });
    expect(await signIn(google("hv@gmail.com"))).toBe("/portal/profile?link=taken");
    withIntent("s1");
    vi.mocked(linkVerifiedGoogleEmail).mockRejectedValue(new Error("db"));
    expect(await signIn(google("hv@gmail.com"))).toBe("/portal/profile?link=error");
  });

  it("gắn xong mà không tra ra học viên → về Hồ sơ (?link=error), không rơi sang trang của chủ (L8)", async () => {
    withIntent("s1");
    vi.mocked(getSessionStudentId).mockResolvedValue("s1");
    vi.mocked(linkVerifiedGoogleEmail).mockResolvedValue({ ok: true });
    h.rows = [];
    expect(await signIn(google("hv@gmail.com"))).toBe("/portal/profile?link=error");
  });

  it("không xoá được cookie vẫn chạy tiếp", async () => {
    h.deleteThrows = true;
    withIntent();
    expect(await signIn(google(OWNER))).toBe(true);
  });
});

describe("authorize() — provider mã truy cập", () => {
  const req = (headers: Record<string, string>) => new Request("https://jl.test/api/auth/callback/access-code", { headers });

  it("thiếu mã → null, không gọi verify", async () => {
    expect(await authorize({}, req({}))).toBeNull();
    expect(verifyAccessCode).not.toHaveBeenCalled();
  });

  it("khoá đếm theo IP: phần tử đầu x-forwarded-for → x-real-ip → 'unknown'", async () => {
    vi.mocked(verifyAccessCode).mockResolvedValue(null);
    await authorize({ code: "ABCD-EFGH" }, req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }));
    await authorize({ code: "ABCD-EFGH" }, req({ "x-real-ip": "9.9.9.9" }));
    await authorize({ code: "ABCD-EFGH" }, req({}));
    expect(vi.mocked(verifyAccessCode).mock.calls.map((c) => c[1])).toEqual([
      { clientKey: "1.2.3.4" },
      { clientKey: "9.9.9.9" },
      { clientKey: "unknown" },
    ]);
  });

  it("bị chặn → ném lỗi code 'rate_limited'", async () => {
    vi.mocked(verifyAccessCode).mockResolvedValue({ blocked: true });
    await expect(authorize({ code: "ABCD-EFGH" }, req({}))).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("đúng mã → chỉ trả id + cờ, không tên/email", async () => {
    vi.mocked(verifyAccessCode).mockResolvedValue({ studentId: "s1", lmsUserId: "u1", accessCodeId: "c1", isMinor: false });
    const u = await authorize({ code: "ABCD-EFGH" }, req({}));
    expect(u).toEqual({ id: "u1", studentId: "s1", lmsUserId: "u1", accessCodeId: "c1", isMinor: false });
  });
});
