import { describe, it, expect } from 'vitest';
import { calcPriorityScore } from '@/lib/priority';

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

describe('calcPriorityScore', () => {
  it('returns null if effort is null', () => {
    expect(calcPriorityScore({ effort: null, impact: 3, deadlineAt: null })).toBeNull();
  });
  it('returns null if impact is null', () => {
    expect(calcPriorityScore({ effort: 3, impact: null, deadlineAt: null })).toBeNull();
  });
  it('returns null if both null', () => {
    expect(calcPriorityScore({ effort: null, impact: null, deadlineAt: null })).toBeNull();
  });
  it('returns number when effort and impact set, no deadline', () => {
    const score = calcPriorityScore({ effort: 3, impact: 3, deadlineAt: null });
    expect(score).not.toBeNull();
    expect(typeof score).toBe('number');
  });
  it('deadline in past -> higher score than far future', () => {
    const past = NOW - 2 * DAY;
    const far = NOW + 30 * DAY;
    const scorePast = calcPriorityScore({ effort: 3, impact: 3, deadlineAt: past, now: NOW })!;
    const scoreFar = calcPriorityScore({ effort: 3, impact: 3, deadlineAt: far, now: NOW })!;
    expect(scorePast).toBeGreaterThan(scoreFar);
  });
  it('deterministic: same inputs = same output', () => {
    const a = calcPriorityScore({ effort: 2, impact: 4, deadlineAt: NOW + DAY, now: NOW });
    const b = calcPriorityScore({ effort: 2, impact: 4, deadlineAt: NOW + DAY, now: NOW });
    expect(a).toBe(b);
  });
  it('score in range 0-100', () => {
    const score = calcPriorityScore({ effort: 1, impact: 5, deadlineAt: NOW - DAY, now: NOW })!;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
  it('undefined effort treated as null -> returns null', () => {
    expect(calcPriorityScore({ effort: undefined, impact: 3, deadlineAt: null })).toBeNull();
  });
});
