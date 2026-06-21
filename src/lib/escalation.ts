import { genId } from "./id";

const DAY = 86_400_000;

// 4 mốc cảnh báo. stored level: 1=warning, 2=urgent. Mức 3 (quá hạn) tính read-time, KHÔNG lưu DB.
export const MILESTONES: { key: string; days: number; level: number }[] = [
  { key: "T-7", days: 7, level: 1 },
  { key: "T-3", days: 3, level: 1 },
  { key: "T-1", days: 1, level: 1 },
  { key: "T-0", days: 0, level: 2 },
];

export function buildDeadlineRows(taskId: string, dueAt: number, now = Date.now()) {
  return MILESTONES.map((m) => ({
    id: genId(),
    taskId,
    dueAt,
    milestone: m.key,
    escalationLevel: m.level,
    snoozeUntil: null as number | null,
    createdAt: now,
  }));
}

// Mức escalation hiệu lực tại thời điểm đọc: quá hạn ⇒ 3; còn lại ⇒ stored.
export function effectiveEscalation(dueAt: number, storedLevel: number, now = Date.now()): 1 | 2 | 3 {
  if (dueAt < now) return 3;
  return (storedLevel === 2 ? 2 : 1);
}

// Đang snooze (ẩn cảnh báo) hay không — tính read-time, không cần cron.
export function isSnoozed(snoozeUntil: number | null | undefined, now = Date.now()): boolean {
  return snoozeUntil != null && now < snoozeUntil;
}

export { DAY };
