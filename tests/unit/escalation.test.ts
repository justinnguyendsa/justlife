import { describe, it, expect } from 'vitest';
import { effectiveEscalation, isSnoozed, buildDeadlineRows } from '@/lib/escalation';

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

describe('effectiveEscalation', () => {
  it('returns 3 (overdue) when dueAt < now', () => {
    expect(effectiveEscalation(NOW - 1000, 1, NOW)).toBe(3);
  });
  it('returns 3 when overdue even if storedLevel=2', () => {
    expect(effectiveEscalation(NOW - DAY, 2, NOW)).toBe(3);
  });
  it('returns 2 (urgent) when stored=2 and not overdue', () => {
    expect(effectiveEscalation(NOW + DAY, 2, NOW)).toBe(2);
  });
  it('returns 1 (warning) when stored=1 and not overdue', () => {
    expect(effectiveEscalation(NOW + 3 * DAY, 1, NOW)).toBe(1);
  });
});

describe('isSnoozed', () => {
  it('returns false when snoozeUntil is null', () => {
    expect(isSnoozed(null, NOW)).toBe(false);
  });
  it('returns false when snoozeUntil is undefined', () => {
    expect(isSnoozed(undefined, NOW)).toBe(false);
  });
  it('returns true when now < snoozeUntil (still snoozed)', () => {
    expect(isSnoozed(NOW + DAY, NOW)).toBe(true);
  });
  it('returns false when snoozeUntil has passed', () => {
    expect(isSnoozed(NOW - 1000, NOW)).toBe(false);
  });
  it('returns false when snoozeUntil === now (expired)', () => {
    expect(isSnoozed(NOW, NOW)).toBe(false);
  });
});

describe('buildDeadlineRows', () => {
  const dueAt = NOW + 10 * DAY;
  const rows = buildDeadlineRows('task-1', dueAt, NOW);

  it('creates exactly 4 rows', () => {
    expect(rows).toHaveLength(4);
  });
  it('has milestones in order T-7, T-3, T-1, T-0', () => {
    expect(rows.map(r => r.milestone)).toEqual(['T-7', 'T-3', 'T-1', 'T-0']);
  });
  it('T-7, T-3, T-1 have escalationLevel=1', () => {
    rows.slice(0, 3).forEach(r => expect(r.escalationLevel).toBe(1));
  });
  it('T-0 has escalationLevel=2', () => {
    expect(rows[3].escalationLevel).toBe(2);
  });
  it('all rows have correct taskId', () => {
    rows.forEach(r => expect(r.taskId).toBe('task-1'));
  });
  it('all rows have snoozeUntil=null', () => {
    rows.forEach(r => expect(r.snoozeUntil).toBeNull());
  });
});
