import { createHash } from "node:crypto";
import { createClient, type Client, type InValue } from "@libsql/client";
import { beforeEach, describe, expect, it } from "vitest";
import { createLoginThrottle, hashThrottleKey, throttleBucket } from "@/lib/lms/login-throttle";

// ADR-005 3e — bộ chặn đoán mã lưu bền (libSQL :memory:), nguyên tử, không lưu IP thô.
const MIN = 60_000;
const DDL = "CREATE TABLE auth_throttle (key_hash TEXT NOT NULL, window_start INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (key_hash, window_start))";
const T0 = 1_000 * 15 * MIN; // đúng đầu một cửa sổ 15 phút
const BASE = { windowMs: 15 * MIN, perKeyMax: 3, globalMax: 10, floodKeyMax: 1, secret: "s" };

let client: Client;
const make = (over: Partial<Parameters<typeof createLoginThrottle>[0]> = {}) => createLoginThrottle({ client, ...BASE, ...over });
const countOf = async (keyHash: string, win = T0) =>
  Number(
    (await client.execute({ sql: "SELECT count FROM auth_throttle WHERE key_hash = ? AND window_start = ?", args: [keyHash, win] }))
      .rows[0]?.count ?? 0,
  );

beforeEach(async () => {
  client = createClient({ url: ":memory:" });
  await client.execute(DDL);
});

describe("bộ chặn đoán mã lưu bền", () => {
  it("chặn đúng nơi vượt ngưỡng, nơi khác vẫn vào", async () => {
    const t = make();
    for (let i = 0; i < 3; i++) expect((await t.attempt("1.2.3.4", T0 + i)).blocked).toBe(false);
    expect((await t.attempt("1.2.3.4", T0 + 3)).blocked).toBe(true);
    expect((await t.attempt("5.6.7.8", T0 + 4)).blocked).toBe(false);
  });

  it("hai instance (hai bộ chặn) cùng đếm trên một DB", async () => {
    const a = make();
    const b = make();
    await a.attempt("ip", T0);
    await b.attempt("ip", T0 + 1);
    await a.attempt("ip", T0 + 2);
    expect((await b.attempt("ip", T0 + 3)).blocked).toBe(true);
  });

  it("bắn song song không vượt ngưỡng", async () => {
    const t = make();
    const r = await Promise.all(Array.from({ length: 8 }, (_, i) => t.attempt("ip", T0 + i)));
    expect(r.filter((x) => !x.blocked).length).toBe(3);
  });

  it("nơi đã bị chặn không cộng thêm (đỡ tốn lượt ghi)", async () => {
    const t = make();
    for (let i = 0; i < 30; i++) await t.attempt("ip", T0 + i);
    expect(await countOf(hashThrottleKey("ip", "s"))).toBe(4); // tối đa perKeyMax + 1
    expect(await countOf("__global__")).toBe(3); // chỉ góp ≤ perKeyMax vào trần chung
  });

  it("đúng mã thì trả lại lượt", async () => {
    const t = make();
    await t.attempt("ip", T0);
    await t.attempt("ip", T0 + 1);
    const third = await t.attempt("ip", T0 + 2);
    await third.refund();
    expect((await t.attempt("ip", T0 + 3)).blocked).toBe(false);
    expect((await t.attempt("ip", T0 + 4)).blocked).toBe(true);
  });

  it("trả lại lượt cũng trả phần đã góp vào trần chung", async () => {
    const t = make();
    for (let i = 0; i < 3; i++) await (await t.attempt(`ip${i}`, T0 + i)).refund();
    expect(await countOf("__global__")).toBe(0);
  });

  it("một nơi không đẩy được trần chung quá ngưỡng của riêng nó", async () => {
    const t = make();
    for (let i = 0; i < 40; i++) await t.attempt("xau", T0 + i);
    expect((await t.attempt("tot", T0 + 50)).blocked).toBe(false);
  });

  it("dồn dập vượt trần chung: chỉ chặn nơi đã thử nhiều, học viên mới vẫn thử được (audit M1)", async () => {
    const t = make();
    for (let i = 0; i < 10; i++) expect((await t.attempt(`ip${i}`, T0 + i)).blocked).toBe(false);
    expect((await t.attempt("ip0", T0 + 20)).blocked).toBe(true); // lượt 2 của ip0 khi đang dồn dập
    expect((await t.attempt("moi", T0 + 21)).blocked).toBe(false); // lượt đầu của nơi mới
    expect((await t.attempt("moi", T0 + 22)).blocked).toBe(true);
    expect(await countOf("__global__")).toBe(11); // trần chung cũng ngừng cộng khi đã vượt
  });

  it("sang cửa sổ mới thì mở lại và dọn cửa sổ cũ", async () => {
    const t = make();
    for (let i = 0; i < 4; i++) await t.attempt("ip", T0 + i);
    expect((await t.attempt("ip", T0 + 15 * MIN - 1)).blocked).toBe(true); // còn trong cửa sổ đầu
    expect((await t.attempt("ip", T0 + 15 * MIN)).blocked).toBe(false);
    const rowsAt = async (w: number) =>
      Number((await client.execute({ sql: "SELECT COUNT(*) AS n FROM auth_throttle WHERE window_start = ?", args: [w] })).rows[0].n);
    expect(await rowsAt(T0)).toBe(2); // khoá "ip" + trần chung, vẫn giữ khi mới sang cửa sổ kế
    await t.attempt("khac", T0 + 31 * MIN); // lượt đầu ở cửa sổ thứ 3 → dọn cửa sổ đầu
    expect(await rowsAt(T0)).toBe(0);
    expect(await rowsAt(T0 + 15 * MIN)).toBe(2);
  });

  it("không lưu IP thô, cũng không lưu sha256 trần (dò ngược được)", async () => {
    const t = make();
    await t.attempt("203.0.113.9", T0);
    const keys = (await client.execute("SELECT key_hash FROM auth_throttle")).rows.map((r) => String(r.key_hash));
    expect(keys.some((k) => k.includes("203.0.113.9"))).toBe(false);
    expect(keys).toContain(hashThrottleKey("203.0.113.9", "s"));
    const naive = createHash("sha256").update("jl-throttle:203.0.113.9").digest("hex");
    expect(keys).not.toContain(naive);
  });

  it("thiếu secret → không ghi DB, vẫn chặn trong bộ nhớ, báo một lần (audit M3)", async () => {
    const warns: unknown[] = [];
    const t = make({ secret: "", onFallback: (e) => warns.push(e) });
    for (let i = 0; i < 3; i++) expect((await t.attempt("ip", T0 + i)).blocked).toBe(false);
    expect((await t.attempt("ip", T0 + 3)).blocked).toBe(true);
    expect(Number((await client.execute("SELECT COUNT(*) AS n FROM auth_throttle")).rows[0].n)).toBe(0);
    expect(warns.length).toBe(1);
    expect(() => hashThrottleKey("ip", "")).toThrow();
  });

  it("bảng chưa có (chưa migrate) → rơi về bộ nhớ, vẫn chặn được, báo một lần", async () => {
    const warns: unknown[] = [];
    const t = make({ client: createClient({ url: ":memory:" }), onFallback: (e) => warns.push(e) });
    for (let i = 0; i < 3; i++) expect((await t.attempt("ip", T0 + i)).blocked).toBe(false);
    expect((await t.attempt("ip", T0 + 3)).blocked).toBe(true);
    expect(warns.length).toBe(1);
  });

  it("trần chung hoặc bước dọn lỗi → vẫn giữ quyết định theo khoá trong DB (audit L2)", async () => {
    const warns: unknown[] = [];
    const flaky = {
      execute: (stmt: { sql: string; args: InValue[] }) =>
        stmt.args[0] === "__global__" || stmt.sql.startsWith("DELETE") ? Promise.reject(new Error("mạng chập chờn")) : client.execute(stmt),
    } as unknown as Client;
    const t = make({ client: flaky, onFallback: (e) => warns.push(e) });
    for (let i = 0; i < 3; i++) expect((await t.attempt("ip", T0 + i)).blocked).toBe(false);
    expect((await t.attempt("ip", T0 + 3)).blocked).toBe(true);
    expect(await countOf(hashThrottleKey("ip", "s"))).toBe(4); // đếm vẫn nằm trong DB, không rơi về bộ nhớ
    expect(warns.length).toBe(1);
  });

  it("không có client → dùng bộ nhớ, đúng mã vẫn trả lại lượt", async () => {
    const t = make({ client: null, perKeyMax: 2 });
    await t.attempt("ip", T0);
    await (await t.attempt("ip", T0 + 1)).refund();
    expect((await t.attempt("ip", T0 + 2)).blocked).toBe(false);
    expect((await t.attempt("ip", T0 + 3)).blocked).toBe(true);
  });

  it("IPv6 cùng dải /64 đếm chung (đổi địa chỉ không né được)", async () => {
    const t = make();
    await t.attempt("2001:db8:1:2::1", T0);
    await t.attempt("2001:db8:1:2:aaaa:bbbb:cccc:dddd", T0 + 1);
    await t.attempt("2001:DB8:1:2:ffff::9", T0 + 2);
    expect((await t.attempt("2001:db8:1:2::abcd", T0 + 3)).blocked).toBe(true);
    expect((await t.attempt("2001:db8:1:3::1", T0 + 4)).blocked).toBe(false);
  });
});

describe("throttleBucket", () => {
  it("gộp địa chỉ về nơi truy cập", () => {
    expect(throttleBucket("203.0.113.9")).toBe("203.0.113.9");
    expect(throttleBucket(" ::ffff:203.0.113.9 ")).toBe("203.0.113.9");
    expect(throttleBucket("::ffff:c000:201")).toBe("192.0.2.1");
    expect(throttleBucket("2001:db8:1:2:aaaa::1")).toBe("2001:db8:1:2::/64");
    expect(throttleBucket("2001:0db8:0001:0002:bbbb:cccc:dddd:eeee")).toBe("2001:db8:1:2::/64");
    expect(throttleBucket("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(throttleBucket("::1")).toBe("0:0:0:0::/64");
    expect(throttleBucket("64:ff9b::192.0.2.1")).toBe("64:ff9b:0:0::/64");
    expect(throttleBucket("unknown")).toBe("unknown");
  });
});
