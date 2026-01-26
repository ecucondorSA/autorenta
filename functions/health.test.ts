import { describe, expect, it } from 'vitest';
import {
  applyFxRate,
  calculateOwnerPayout,
  calculatePlatformFee,
  centsToUnits,
  parseMoney,
  unitsToCents,
} from '../apps/web/src/app/shared/utils/money.utils';

describe('money utils', () => {
  it('converts units to cents and back', () => {
    expect(unitsToCents(123.45)).toBe(12345);
    expect(centsToUnits(12345)).toBe(123.45);
  });

  it('calculates platform fee and owner payout', () => {
    expect(calculatePlatformFee(1000)).toBe(150);
    expect(calculateOwnerPayout(1000)).toBe(850);
  });

  it('applies FX rate', () => {
    expect(applyFxRate(100, 1000)).toBe(100000);
  });

  it('parses money strings with locale separators', () => {
    expect(parseMoney('$1,234.56', 'USD')).toBe(1234.56);
    expect(parseMoney('$1.234,56', 'ARS')).toBe(1234.56);
  });
});
