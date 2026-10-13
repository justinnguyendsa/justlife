import { describe, expect, it } from "vitest";
import { fmtDate, fmtDayShort, fmtDuration, maskEmail } from "@/lib/format";

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

describe("che email", () => {
  it("giữ 4 ký tự đầu và tên miền", () => {
    expect(maskEmail("minhnn2511@gmail.com")).toBe("minh•••••@gmail.com");
  });
  it("tên ngắn chỉ giữ 1 ký tự; không có @ thì che hết", () => {
    expect(maskEmail("abcd@x.vn")).toBe("a•••••@x.vn");
    expect(maskEmail("ab@x.vn")).toBe("a•••••@x.vn");
    expect(maskEmail("khongphaiemail")).toBe("•••••");
  });
});
