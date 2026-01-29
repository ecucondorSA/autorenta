import { describe, expect, it } from 'vitest';
import {
  formatUsd,
  normalizeCentsToUsd,
  normalizeRecordToUsd,
  normalizeToUsd,
} from './currency.utils';

describe('currency utils', () => {
  it('normalizes amounts to USD', () => {
    expect(normalizeToUsd(50, 'USD')).toBe(50);
    expect(normalizeToUsd(1000, 'ARS', 1000)).toBe(1);
    expect(normalizeToUsd(1000, 'ARS')).toBe(1000);
  });

  it('normalizes records using fx snapshot fields', () => {
    const record = { total_price: 1000, currency: 'ARS', fx_snapshot: 1000 };
    expect(normalizeRecordToUsd(record)).toBe(1);
  });

  it('normalizes cents to USD', () => {
    expect(normalizeCentsToUsd(12345, 'USD')).toBe(123.45);
  });

  it('formats USD without symbol', () => {
    const formatted = formatUsd(1000, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      showSymbol: false,
    });
    expect(formatted).toBe('1,000');
  });
});
