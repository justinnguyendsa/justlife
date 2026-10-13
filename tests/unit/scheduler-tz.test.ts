import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { detectConflicts, maskHasDate, parseVnDate, startOfDay, startOfWeek, vnDayOfMonth, vnWeekday } from "@/lib/scheduler";
import type { FixedSchedule } from "@/db/schema";

// Giả lập server Vercel chạy giờ UTC: kết quả phải theo giờ Việt Nam (UTC+7) bất kể giờ máy.
const prevTz = process.env.TZ;
beforeAll(() => { process.env.TZ = "UTC"; });
afterAll(() => { process.env.TZ = prevTz; });

const H = 3_600_000;
const vn = (iso: string) => Date.parse(`${iso}+07:00`);

describe("startOfDay theo giờ Việt Nam", () => {
  it("06:30 sáng VN (23:30 UTC hôm trước) vẫn thuộc ngày VN hiện tại", () => {
    expect(startOfDay(vn("2026-10-13T06:30:00"))).toBe(vn("2026-10-13T00:00:00"));
  });
  it("23:59 VN vẫn là cùng ngày, 00:00 VN là ngày mới", () => {
    expect(startOfDay(vn("2026-10-13T23:59:59"))).toBe(vn("2026-10-13T00:00:00"));
    expect(startOfDay(vn("2026-10-14T00:00:00"))).toBe(vn("2026-10-14T00:00:00"));
  });
});

describe("thứ, ngày và đầu tuần theo giờ Việt Nam", () => {
  it("vnWeekday / vnDayOfMonth", () => {
    expect(vnWeekday(vn("2026-10-13T01:00:00"))).toBe(2); // thứ Ba
    expect(vnDayOfMonth(vn("2026-10-13T01:00:00"))).toBe(13);
    expect(vnWeekday(vn("2026-10-18T23:00:00"))).toBe(0); // Chủ nhật
  });
  it("startOfWeek trả 00:00 thứ Hai VN, kể cả khi đang Chủ nhật", () => {
    expect(startOfWeek(vn("2026-10-13T08:00:00"))).toBe(vn("2026-10-12T00:00:00"));
    expect(startOfWeek(vn("2026-10-18T23:30:00"))).toBe(vn("2026-10-12T00:00:00"));
    expect(startOfWeek(vn("2026-10-12T00:00:00"))).toBe(vn("2026-10-12T00:00:00"));
  });
  it("parseVnDate", () => {
    expect(parseVnDate("2026-10-13")).toBe(vn("2026-10-13T00:00:00"));
    expect(parseVnDate("13/10/2026")).toBeNaN();
  });
});

describe("lịch cố định rơi đúng thứ và đúng giờ", () => {
  // Lịch làm việc thứ Ba (bit1), 08:30–12:00.
  const fixed = { id: "f1", label: "Giờ làm", area: "work", weekdayMask: 1 << 1, startMin: 8 * 60 + 30, endMin: 12 * 60 } as FixedSchedule;
  it("maskHasDate dùng thứ theo giờ VN", () => {
    // 06:00 thứ Ba VN = 23:00 UTC thứ Hai — trước đây bị tính là thứ Hai.
    expect(maskHasDate(fixed.weekdayMask, new Date(vn("2026-10-13T06:00:00")))).toBe(true);
  });
  it("detectConflicts báo trùng đúng khung 08:30–12:00 VN", () => {
    const hit = detectConflicts(vn("2026-10-13T09:00:00"), vn("2026-10-13T10:00:00"), [fixed], []);
    expect(hit).toHaveLength(1);
    expect(hit[0].startAt).toBe(vn("2026-10-13T08:30:00"));
    expect(detectConflicts(vn("2026-10-13T13:00:00"), vn("2026-10-13T13:00:00") + H, [fixed], [])).toHaveLength(0);
  });
});
