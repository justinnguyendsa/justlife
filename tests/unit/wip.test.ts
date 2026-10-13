import { describe, expect, it } from "vitest";
import { isValidWipLimit, isWipExceeded, parseWipLimit } from "@/lib/wip";

// SPEC-UI-P2.5 B01 — 0 = không giới hạn; giá trị hỏng → 3.
describe("giới hạn đang làm", () => {
  it("đọc giá trị đã lưu", () => {
    expect(parseWipLimit("2")).toBe(2);
    expect(parseWipLimit("0")).toBe(0);
    expect(parseWipLimit(" 5 ")).toBe(5);
    expect(parseWipLimit(undefined)).toBe(3);
    expect(parseWipLimit("abc")).toBe(3);
    expect(parseWipLimit("-1")).toBe(3);
    expect(parseWipLimit("1.5")).toBe(3);
    expect(parseWipLimit("11")).toBe(3);
    expect(parseWipLimit("10")).toBe(10);
    expect(parseWipLimit("")).toBe(3);
  });
  it("kiểm tra giá trị được phép lưu", () => {
    expect(isValidWipLimit(0)).toBe(true);
    expect(isValidWipLimit(10)).toBe(true);
    expect(isValidWipLimit(11)).toBe(false);
    expect(isValidWipLimit(2.5)).toBe(false);
    expect(isValidWipLimit("2")).toBe(false);
  });
  it("đủ việc đang làm", () => {
    expect(isWipExceeded(2, 2)).toBe(true);
    expect(isWipExceeded(1, 2)).toBe(false);
    expect(isWipExceeded(99, 0)).toBe(false);
  });
});
