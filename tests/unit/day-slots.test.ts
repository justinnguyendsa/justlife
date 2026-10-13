import { describe, expect, it } from "vitest";
import { freeSlots } from "@/lib/day-slots";

// SPEC-UI-P2.1 T06 — khe trống ≥ 60 phút trong 07:00–22:00 giờ VN, chỉ phần sau "bây giờ".
const vn = (hhmm: string) => Date.parse(`2026-10-13T${hhmm}:00+07:00`);
const day0 = vn("00:00");
const block = (a: string, b: string) => ({ startAt: vn(a), endAt: vn(b) });

describe("freeSlots", () => {
  it("bỏ phần trước 'bây giờ', làm tròn lên 15 phút", () => {
    const s = freeSlots(day0, [block("15:30", "22:00")], vn("14:07"));
    expect(s).toEqual([{ startAt: vn("14:15"), endAt: vn("15:30") }]);
  });

  it("gộp khối chồng nhau và chỉ giữ khe ≥ 60 phút", () => {
    const busy = [block("08:30", "12:00"), block("11:00", "13:00"), block("13:30", "14:00"), block("15:30", "17:00")];
    const s = freeSlots(day0, busy, vn("06:00"));
    // 07:00–08:30 (90') · 13:00–13:30 (30', loại) · 14:00–15:30 (90') · 17:00–22:00 (bị cắt vì max=2)
    expect(s).toEqual([
      { startAt: vn("07:00"), endAt: vn("08:30") },
      { startAt: vn("14:00"), endAt: vn("15:30") },
    ]);
  });

  it("hết ngày làm việc thì không còn khe", () => {
    expect(freeSlots(day0, [], vn("22:30"))).toEqual([]);
  });

  it("ngày trống: một khe từ bây giờ tới 22:00", () => {
    expect(freeSlots(day0, [], vn("19:40"), { max: 5 })).toEqual([{ startAt: vn("19:45"), endAt: vn("22:00") }]);
  });
});

describe("freeSlots — ca biên", () => {
  it("khe đúng 60 phút được giữ, 59 phút bị loại", () => {
    expect(freeSlots(day0, [block("08:00", "22:00")], vn("06:00"))).toEqual([{ startAt: vn("07:00"), endAt: vn("08:00") }]);
    expect(freeSlots(day0, [block("07:59", "22:00")], vn("06:00"))).toEqual([]);
  });
  it("khối tràn ra ngoài cửa sổ 07–22 và khối bắt đầu trước 'bây giờ'", () => {
    const s = freeSlots(day0, [block("05:00", "09:00"), block("12:00", "23:30")], vn("10:00"));
    expect(s).toEqual([{ startAt: vn("10:00"), endAt: vn("12:00") }]);
  });
  it("khối sát nhau không tạo khe 0 phút", () => {
    const s = freeSlots(day0, [block("07:00", "09:00"), block("09:00", "11:00")], vn("06:00"), { max: 5 });
    expect(s).toEqual([{ startAt: vn("11:00"), endAt: vn("22:00") }]);
  });
});
