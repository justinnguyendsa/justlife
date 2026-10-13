import { describe, expect, it } from "vitest";
import { validateFixed, weekdayRange } from "@/lib/fixed-schedule";

const base = { label: "Giờ làm việc", area: "work", startMin: 510, endMin: 1080, weekdayMask: 31 };

// SPEC-UI-P2.5 B04, F10.
describe("khung giờ bận cố định", () => {
  it("hợp lệ thì trả về bản đã trim", () => {
    const r = validateFixed({ ...base, label: "  Giờ làm việc  " });
    expect(r).toEqual({ ok: true, value: base });
  });
  it("báo lỗi tiếng Việt cho từng trường sai", () => {
    const err = (patch: Partial<typeof base>) => {
      const r = validateFixed({ ...base, ...patch });
      return r.ok ? null : r.error;
    };
    expect(err({ label: "   " })).toBe("Nhập tên khung");
    expect(err({ label: "x".repeat(81) })).toMatch(/tối đa 80/);
    expect(err({ area: "hack" })).toBe("Chọn mảng cho khung");
    expect(err({ startMin: -5 })).toBe("Giờ không hợp lệ");
    expect(err({ endMin: 1500 })).toBe("Giờ không hợp lệ");
    expect(err({ startMin: 1.5 })).toBe("Giờ không hợp lệ");
    expect(err({ endMin: 510 })).toBe("Giờ kết thúc phải sau giờ bắt đầu");
    expect(err({ weekdayMask: 0 })).toBe("Chọn ít nhất một ngày lặp lại");
    expect(err({ weekdayMask: 128 })).toBe("Chọn ít nhất một ngày lặp lại");
    expect(err({ startMin: NaN })).toBe("Giờ không hợp lệ");
    expect(err({ endMin: 400 })).toBe("Giờ kết thúc phải sau giờ bắt đầu");
    expect(err({ label: "x".repeat(80) })).toBeNull();
    expect(err({ weekdayMask: 127 })).toBeNull();
  });
  it("ghi ngày lặp lại gọn", () => {
    expect(weekdayRange(0b0011111)).toBe("T2–T6");
    expect(weekdayRange(0b0001010)).toBe("T3, T5");
    expect(weekdayRange(0b0100000)).toBe("T7");
    expect(weekdayRange(0b0000011)).toBe("T2, T3");
    expect(weekdayRange(127)).toBe("Hằng ngày");
    expect(weekdayRange(0)).toBe("");
  });
});
