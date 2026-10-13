import { createClient } from "@libsql/client";
import { beforeEach, describe, expect, it } from "vitest";
import { createLoginThrottle, hashThrottleKey } from "@/lib/lms/login-throttle";

// ADR-005 3e — bộ chặn đoán mã lưu bền (libSQL :memory:), nguyên tử, không lưu IP thô.
const MIN = 60_000;
const DDL = "CREATE TABLE auth_throttle (key_hash TEXT NOT NULL, window_start INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (key_hash, window_start))";
const T0 = 1_000 * 15 * MIN; // đúng đầu một cửa sổ 15 phút

let client: ReturnType<typeof createClient>;
const make = (c = client) => createLoginThrottle({ client: c, windowMs: 15 * MIN, perKeyMax: 3, globalMax: 10, secret: "s" });

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
    const g = await client.execute({ sql: "SELECT count FROM auth_throttle WHERE key_hash = '__global__' AND window_start = ?", args: [T0] });
    expect(Number(g.rows[0].count)).toBe(0);
  });

  it("trần chung: nhiều nơi cùng dồn dập thì chặn cả", async () => {
    const t = make();
    for (let i = 0; i < 10; i++) expect((await t.attempt(`ip${i}`, T0 + i)).blocked).toBe(false);
    expect((await t.attempt("ipMoi", T0 + 20)).blocked).toBe(true);
  });

  it("một nơi không đẩy được trần chung quá ngưỡng của riêng nó", async () => {
    const t = make();
    for (let i = 0; i < 40; i++) await t.attempt("xau", T0 + i);
    expect((await t.attempt("tot", T0 + 50)).blocked).toBe(false);
  });

  it("sang cửa sổ mới thì mở lại và dọn cửa sổ cũ", async () => {
    const t = make();
    for (let i = 0; i < 4; i++) await t.attempt("ip", T0 + i);
    expect((await t.attempt("ip", T0 + 15 * MIN)).blocked).toBe(false);
    const rowsAt = async (w: number) =>
      Number((await client.execute({ sql: "SELECT COUNT(*) AS n FROM auth_throttle WHERE window_start = ?", args: [w] })).rows[0].n);
    expect(await rowsAt(T0)).toBe(2); // khoá "ip" + trần chung, vẫn giữ khi mới sang cửa sổ kế
    await t.attempt("khac", T0 + 31 * MIN); // lượt đầu ở cửa sổ thứ 3 → dọn cửa sổ đầu
    expect(await rowsAt(T0)).toBe(0);
    expect(await rowsAt(T0 + 15 * MIN)).toBe(2);
  });

  it("không lưu IP thô", async () => {
    const t = make();
    await t.attempt("203.0.113.9", T0);
    const rows = await client.execute("SELECT key_hash FROM auth_throttle");
    const keys = rows.rows.map((r) => String(r.key_hash));
    expect(keys.some((k) => k.includes("203.0.113.9"))).toBe(false);
    expect(keys).toContain(hashThrottleKey("203.0.113.9", "s"));
  });

  it("bảng chưa có (chưa migrate) → rơi về bộ nhớ, vẫn chặn được, báo một lần", async () => {
    const bare = createClient({ url: ":memory:" });
    const warns: unknown[] = [];
    const t = createLoginThrottle({ client: bare, windowMs: 15 * MIN, perKeyMax: 3, globalMax: 10, secret: "s", onFallback: (e) => warns.push(e) });
    for (let i = 0; i < 3; i++) expect((await t.attempt("ip", T0 + i)).blocked).toBe(false);
    expect((await t.attempt("ip", T0 + 3)).blocked).toBe(true);
    expect(warns.length).toBe(1);
  });

  it("không có client → dùng bộ nhớ, đúng mã vẫn trả lại lượt", async () => {
    const t = createLoginThrottle({ client: null, windowMs: 15 * MIN, perKeyMax: 2, globalMax: 10, secret: "s" });
    await t.attempt("ip", T0);
    await (await t.attempt("ip", T0 + 1)).refund();
    expect((await t.attempt("ip", T0 + 2)).blocked).toBe(false);
    expect((await t.attempt("ip", T0 + 3)).blocked).toBe(true);
  });
});
