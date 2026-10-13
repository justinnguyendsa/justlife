import { describe, expect, it } from "vitest";
import { fmtDate, fmtDayShort, fmtDuration } from "@/lib/format";

const vn = (iso: string) => Date.parse(`${iso}+07:00`);

describe("định dạng ngày giờ theo giờ Việt Nam", () => {
  it("fmtDate trả dd/MM", () => {
    expect(fmtDate(vn("2026-10-13T00:30:00"))).toBe("13/10");
  });
  it("fmtDayShort có thứ và dd/MM", () => {
    expect(fmtDayShort(vn("2026-10-13T08:00:00"))).toMatch(/Thứ Ba.*13\/10/);
  });
  it("fmtDuration", () => {
    expect(fmtDuration(45)).toBe("45 phút");
    expect(fmtDuration(90)).toBe("1 giờ 30");
    expect(fmtDuration(120)).toBe("2 giờ");
  });
});
