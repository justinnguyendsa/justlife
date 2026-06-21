// Điểm ưu tiên = urgency(deadline) + impact + nghịch đảo effort. Deterministic, range 0..100.
// Thiếu effort HOẶC impact → null ("Chưa ưu tiên"). (AC-03-x, lib thuần để unit-test.)

const DAY = 86_400_000;

export function calcPriorityScore(input: {
  effort: number | null | undefined;
  impact: number | null | undefined;
  deadlineAt: number | null | undefined;
  now?: number;
}): number | null {
  const { effort, impact, deadlineAt } = input;
  if (effort == null || impact == null) return null;
  const now = input.now ?? Date.now();

  let urgency = 18; // không deadline
  if (deadlineAt != null) {
    const days = (deadlineAt - now) / DAY;
    urgency = days <= 0 ? 50 : days < 1 ? 46 : days < 3 ? 40 : days < 7 ? 30 : 22;
  }
  const impactPts = clamp(impact, 1, 5) * 6; // 6..30
  const effortPts = (6 - clamp(effort, 1, 5)) * 4; // 4..20 (effort thấp ⇒ điểm cao)
  return Math.max(0, Math.min(100, Math.round(urgency + impactPts + effortPts)));
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
