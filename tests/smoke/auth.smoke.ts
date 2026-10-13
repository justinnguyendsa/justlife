import { describe, expect, inject, it } from "vitest";
import { createClient } from "@libsql/client";
import { encode } from "@auth/core/jwt";

// ADR-005 3a §7.9 — cổng đăng nhập trên bản build production thật (`next start`).
// Đây là cách tự động DUY NHẤT chứng minh middleware (sau này là proxy ở Next 16) thật sự được nhận
// và matcher còn đúng. Chạy: `npm run test:smoke`. Không chạy trong `npm test` thường ngày.

const BASE = inject("smokeBase");
const BAD = inject("smokeMisconfigured");
const CODE = inject("smokeCode");
const SECRET = inject("smokeSecret");
const LMS_DB = inject("smokeLmsDb");
const OWNER = "owner@example.test";
const COOKIE = "authjs.session-token"; // http://localhost → tên cookie không có tiền tố __Secure-

const get = (base: string, path: string, cookie?: string) =>
  fetch(base + path, { redirect: "manual", headers: cookie ? { cookie } : {} });
const where = (r: Response) => {
  const l = r.headers.get("location");
  if (!l) return null;
  const u = new URL(l, BASE);
  return u.pathname + u.search;
};
// Mỗi tên cookie giữ bản ĐẶT SAU CÙNG: /api/auth/* đi qua cả middleware lẫn route handler nên
// cookie csrf bị đặt 2 lần; bản sau cùng (route handler) mới khớp csrfToken trả về trong JSON.
const jar = (r: Response) => {
  const m = new Map<string, string>();
  for (const c of r.headers.getSetCookie()) {
    const pair = c.split(";")[0];
    m.set(pair.slice(0, pair.indexOf("=")), pair);
  }
  return [...m.values()];
};

async function postCode(code: string): Promise<Response> {
  const csrf = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };
  return fetch(`${BASE}/api/auth/callback/access-code`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: jar(csrf).join("; ") },
    body: new URLSearchParams({ code, csrfToken, callbackUrl: `${BASE}/portal` }),
  });
}

async function studentCookie(): Promise<string> {
  const res = await postCode(CODE);
  const session = jar(res).find((c) => c.startsWith(`${COOKIE}=`));
  if (!session) throw new Error(`[smoke] đăng nhập mã không tạo phiên (status ${res.status})`);
  return session;
}

async function ownerCookie(): Promise<string> {
  const token = await encode({ token: { role: "owner", email: OWNER, sub: "owner" }, secret: SECRET, salt: COOKIE });
  return `${COOKIE}=${token}`;
}

describe("cloud — chưa đăng nhập", () => {
  it("trang của chủ → /login?error=SignedOut; API của chủ → 401", async () => {
    expect(where(await get(BASE, "/today"))).toBe("/login?error=SignedOut");
    expect((await get(BASE, "/api/personal/tasks")).status).toBe(401);
  });

  it("trang đăng nhập mở; cổng học viên → /portal/login", async () => {
    expect((await get(BASE, "/login")).status).toBe(200);
    expect((await get(BASE, "/portal/login")).status).toBe(200);
    expect(where(await get(BASE, "/portal"))).toMatch(/^\/portal\/login/);
  });

  it("link chia sẻ công khai không bị đẩy về /login", async () => {
    const r = await get(BASE, "/share/khong-ton-tai");
    expect(where(r) ?? "").not.toMatch(/^\/login/);
  });

  it("đường dẫn middleware bỏ qua (đuôi .png) vẫn bị guard trang chặn", async () => {
    const body = await (await get(BASE, "/study/abc.png")).text();
    expect(body).toContain("NEXT_REDIRECT;replace;/login?error=WrongRole");
  });
});

describe("cloud — đăng nhập", () => {
  it("học viên đăng nhập bằng mã thật → vào cổng; không vào được khu của chủ", async () => {
    const c = await studentCookie();
    expect((await get(BASE, "/portal", c)).status).toBe(200);
    expect(where(await get(BASE, "/today", c))).toBe("/login?error=WrongRole");
    expect((await get(BASE, "/api/personal/tasks", c)).status).toBe(401);
  });

  it("mã sai → đếm vào bảng auth_throttle (lưu bền, không IP thô), không lỗi máy chủ", async () => {
    const res = await postCode("ZZZZ-ZZZZ");
    expect(res.status).toBeLessThan(500);
    expect(jar(res).some((c) => c.startsWith(`${COOKIE}=`))).toBe(false);
    const db = createClient({ url: LMS_DB });
    try {
      const rows = (await db.execute("SELECT key_hash, count FROM auth_throttle")).rows;
      expect(rows.some((r) => r.key_hash === "__global__" && Number(r.count) >= 1)).toBe(true);
      expect(rows.every((r) => /^(__global__|[0-9a-f]{64})$/.test(String(r.key_hash)))).toBe(true);
    } finally {
      db.close();
    }
  });

  it("owner (cookie mã hoá thật) → vào khu cá nhân và API", async () => {
    const c = await ownerCookie();
    expect((await get(BASE, "/today", c)).status).toBe(200);
    expect((await get(BASE, "/api/personal/fixed-schedules", c)).status).toBe(200);
    const body = await (await get(BASE, "/study/abc.png", c)).text();
    expect(body).not.toContain("NEXT_REDIRECT;replace;/login");
  });

  it("cookie bị sửa → như chưa đăng nhập", async () => {
    const c = (await ownerCookie()).slice(0, -4) + "AAAA";
    expect(where(await get(BASE, "/today", c))).toBe("/login?error=SignedOut");
  });
});

describe("production thiếu OWNER_EMAIL → khoá lại (fail-closed)", () => {
  it("trang của chủ → Configuration; API → 503; trang đăng nhập vẫn mở", async () => {
    expect(where(await get(BAD, "/today"))).toBe("/login?error=Configuration");
    expect((await get(BAD, "/api/personal/tasks")).status).toBe(503);
    expect((await get(BAD, "/portal/login")).status).toBe(200);
  });
});
