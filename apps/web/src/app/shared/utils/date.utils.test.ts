import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDaysBetween, isPast } from './date.utils';

describe('date utils', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates days between two dates', () => {
    expect(getDaysBetween('2024-01-01', '2024-01-03')).toBe(2);
  });

  it('detects past dates relative to now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-26T12:00:00Z'));

    expect(isPast('2026-01-25T23:59:59Z')).toBe(true);
    expect(isPast('2026-01-26T12:00:00Z')).toBe(false);
  });
});
