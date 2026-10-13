// Đồng hồ Tập trung (SPEC-UI-P2.4 F04/F08). Phần tính toán là hàm thuần (có test);
// phần nhớ trạng thái dùng sessionStorage/localStorage, bọc try/catch (bị chặn thì chỉ không nhớ).

export const SESSION_MS = 25 * 60_000;
export const SESSIONS_PER_DAY = 4;

export type TimerState = {
  taskId: string;
  running: boolean;
  endsAt: number; // khi running
  remainingMs: number; // khi tạm dừng
};

export function remainingOf(s: TimerState, now: number): number {
  return Math.max(0, s.running ? s.endsAt - now : s.remainingMs);
}

export function startTimer(taskId: string, now: number, remainingMs = SESSION_MS): TimerState {
  return { taskId, running: true, endsAt: now + remainingMs, remainingMs };
}

export function pauseTimer(s: TimerState, now: number): TimerState {
  return { ...s, running: false, remainingMs: remainingOf(s, now) };
}

export function resumeTimer(s: TimerState, now: number): TimerState {
  return { ...s, running: true, endsAt: now + s.remainingMs };
}

/** "18:42" */
export function fmtClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** % đã chạy của phiên (0–100). */
export function progressPct(remainingMs: number): number {
  return Math.round(((SESSION_MS - Math.min(SESSION_MS, remainingMs)) / SESSION_MS) * 100);
}

// ─── Nhớ trên trình duyệt ─────────────────────────────────────────────────────
const TIMER_KEY = "jl-focus-timer";
const statsKey = (day: string) => `jl-focus-${day}`;

export function loadTimer(): TimerState | null {
  try {
    const raw = sessionStorage.getItem(TIMER_KEY);
    return raw ? (JSON.parse(raw) as TimerState) : null;
  } catch {
    return null;
  }
}

export function saveTimer(s: TimerState | null) {
  try {
    if (s) sessionStorage.setItem(TIMER_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(TIMER_KEY);
  } catch {
    /* bộ nhớ bị chặn — bỏ qua */
  }
}

export type DayStats = { sessions: number; minutes: number };

export function loadStats(day: string): DayStats {
  try {
    const raw = localStorage.getItem(statsKey(day));
    const v = raw ? (JSON.parse(raw) as DayStats) : null;
    return v && Number.isFinite(v.sessions) && Number.isFinite(v.minutes) ? v : { sessions: 0, minutes: 0 };
  } catch {
    return { sessions: 0, minutes: 0 };
  }
}

export function addStats(day: string, add: Partial<DayStats>): DayStats {
  const cur = loadStats(day);
  const next = { sessions: cur.sessions + (add.sessions ?? 0), minutes: cur.minutes + (add.minutes ?? 0) };
  try {
    localStorage.setItem(statsKey(day), JSON.stringify(next));
  } catch {
    /* bỏ qua */
  }
  return next;
}
