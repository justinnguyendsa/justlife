import { describe, expect, it } from "vitest";
import { SESSION_MS, fmtClock, parseClock, pauseTimer, progressPct, remainingOf, resumeTimer, startTimer } from "@/lib/focus-timer";

// SPEC-UI-P2.4 F08 — đồng hồ tính theo endsAt nên tab ẩn (tick chậm) vẫn đúng giờ.
const T0 = 1_000_000;

describe("focus-timer", () => {
  it("bắt đầu 25 phút, còn lại giảm theo thời gian thực", () => {
    const s = startTimer("t1", T0);
    expect(remainingOf(s, T0)).toBe(SESSION_MS);
    expect(remainingOf(s, T0 + 60_000)).toBe(SESSION_MS - 60_000);
    expect(remainingOf(s, T0 + SESSION_MS + 5_000)).toBe(0);
  });

  it("tạm dừng giữ nguyên thời gian còn lại, tiếp tục chạy tiếp từ đó", () => {
    const paused = pauseTimer(startTimer("t1", T0), T0 + 10 * 60_000);
    expect(remainingOf(paused, T0 + 99 * 60_000)).toBe(15 * 60_000);
    const resumed = resumeTimer(paused, T0 + 30 * 60_000);
    expect(remainingOf(resumed, T0 + 31 * 60_000)).toBe(14 * 60_000);
  });

  it("định dạng mm:ss làm tròn lên giây", () => {
    expect(fmtClock(SESSION_MS)).toBe("25:00");
    expect(fmtClock(18 * 60_000 + 41_500)).toBe("18:42");
    expect(fmtClock(0)).toBe("00:00");
  });

  it("phần trăm tiến độ", () => {
    expect(progressPct(SESSION_MS)).toBe(0);
    expect(progressPct(SESSION_MS * 0.75)).toBe(25);
    expect(progressPct(0)).toBe(100);
  });

  it("đọc đồng hồ đã lưu: đúng hình dạng thì nhận, hỏng/thiếu trường thì bỏ", () => {
    const ok = { ...startTimer("t1", T0), segStart: T0 };
    expect(parseClock(JSON.stringify(ok))).toEqual({ ...ok, ended: false });
    expect(parseClock(JSON.stringify({ ...ok, ended: true }))?.ended).toBe(true);
    expect(parseClock(null)).toBeNull();
    expect(parseClock("{hỏng")).toBeNull();
    expect(parseClock("null")).toBeNull();
    expect(parseClock(JSON.stringify({ taskId: "t1", running: true, endsAt: T0 }))).toBeNull();
    expect(parseClock(JSON.stringify({ ...ok, endsAt: "x" }))).toBeNull();
  });
});
