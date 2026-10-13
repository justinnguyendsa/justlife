import { describe, expect, it } from "vitest";
import { createFailThrottle } from "@/lib/lms/fail-throttle";

// SPEC-SEC-1.2 S02 — một nơi nhập sai không khoá nơi khác; ngưỡng chung chặn tấn công dồn dập.
const MIN = 60_000;
const make = () => createFailThrottle({ windowMs: 15 * MIN, perKeyMax: 3, globalMax: 10, maxKeys: 4 });

describe("bộ chặn đoán mã theo khoá", () => {
  it("khoá đúng nơi nhập sai, nơi khác vẫn vào được", () => {
    const t = make();
    for (let i = 0; i < 3; i++) t.recordFail("ip-a", i);
    expect(t.isBlocked("ip-a", 10)).toBe(true);
    expect(t.isBlocked("ip-b", 10)).toBe(false);
  });

  it("hết cửa sổ thời gian thì mở lại", () => {
    const t = make();
    for (let i = 0; i < 3; i++) t.recordFail("ip-a", 0);
    expect(t.isBlocked("ip-a", 15 * MIN - 1)).toBe(true);
    expect(t.isBlocked("ip-a", 15 * MIN)).toBe(false);
  });

  it("ngưỡng chung chặn mọi nơi khi bị dồn dập", () => {
    const t = make();
    for (let i = 0; i < 10; i++) t.recordFail(`ip-${i}`, i);
    expect(t.isBlocked("ip-moi", 20)).toBe(true);
    expect(t.isBlocked("ip-moi", 15 * MIN + 20)).toBe(false);
  });

  it("đúng mã thì trả lại lượt đã tính", () => {
    const t = make();
    t.recordFail("ip-a", 1);
    t.recordFail("ip-a", 2);
    t.recordFail("ip-a", 3); // lượt thứ 3 hoá ra đúng mã
    t.refund("ip-a");
    expect(t.isBlocked("ip-a", 4)).toBe(false);
  });

  it("một nơi không đẩy được trần chung quá ngưỡng của riêng nó", () => {
    const t = make(); // perKeyMax 3, globalMax 10
    for (let i = 0; i < 50; i++) t.recordFail("ip-xau", i);
    expect(t.isBlocked("ip-xau", 60)).toBe(true);
    expect(t.isBlocked("ip-tot", 60)).toBe(false);
  });

  it("giới hạn số khoá trong bộ nhớ", () => {
    const t = make();
    for (let i = 0; i < 3; i++) t.recordFail("ip-cu", i);
    for (const k of ["k1", "k2", "k3", "k4"]) t.recordFail(k, 5);
    // ip-cu bị đẩy ra khi vượt maxKeys → không còn bị khoá theo khoá riêng
    expect(t.isBlocked("ip-cu", 6)).toBe(false);
  });
});
