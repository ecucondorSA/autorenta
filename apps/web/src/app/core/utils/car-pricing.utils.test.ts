import { describe, expect, it } from 'vitest';
import {
  calculateFallbackHourlyRateUsd,
  normalizeToHourIso,
  toUsdDollarFirst,
} from './car-pricing.utils';

describe('car pricing utils', () => {
  describe('toUsdDollarFirst', () => {
    it('returns null for invalid amounts', () => {
      expect(toUsdDollarFirst(NaN, 'USD', { binance: 1000 })).toBeNull();
      expect(toUsdDollarFirst(0, 'USD', { binance: 1000 })).toBeNull();
      expect(toUsdDollarFirst(-10, 'USD', { binance: 1000 })).toBeNull();
    });

    it('keeps USD amounts as-is', () => {
      expect(toUsdDollarFirst(55, 'USD', null)).toBe(55);
      expect(toUsdDollarFirst(55, 'usd', null)).toBe(55);
    });

    it('converts ARS to USD using raw binance rate', () => {
      expect(toUsdDollarFirst(10000, 'ARS', { binance: 1000 })).toBe(10);
    });

    it('returns null for ARS when rate is missing/invalid', () => {
      expect(toUsdDollarFirst(10000, 'ARS', null)).toBeNull();
      expect(toUsdDollarFirst(10000, 'ARS', { binance: 0 })).toBeNull();
    });

    it('treats unknown currencies as already-normalized USD', () => {
      expect(toUsdDollarFirst(123, 'BRL', null)).toBe(123);
    });
  });

  describe('normalizeToHourIso', () => {
    it('normalizes minutes/seconds/ms to zero', () => {
      const iso = normalizeToHourIso(new Date('2026-02-08T12:34:56.789Z'));
      expect(iso).toBe('2026-02-08T12:00:00.000Z');
    });
  });

  describe('calculateFallbackHourlyRateUsd', () => {
    it('uses 75% of daily price divided by 24', () => {
      expect(calculateFallbackHourlyRateUsd(100)).toBeCloseTo(3.125, 6);
    });

    it('returns 0 for invalid inputs', () => {
      expect(calculateFallbackHourlyRateUsd(NaN)).toBe(0);
      expect(calculateFallbackHourlyRateUsd(0)).toBe(0);
      expect(calculateFallbackHourlyRateUsd(-10)).toBe(0);
    });
  });
});
