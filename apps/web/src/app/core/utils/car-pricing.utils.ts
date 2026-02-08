export interface DollarFirstRates {
  binance: number;
}

export function normalizeCurrency(currency: string | null | undefined): string {
  return (currency || 'USD').toUpperCase();
}

/**
 * Normalize a date to the start of the hour, then return as ISO string.
 * This avoids cache-busting "now" timestamps when computing quick quotes.
 */
export function normalizeToHourIso(date: Date): string {
  const normalized = new Date(date);
  if (Number.isNaN(normalized.getTime())) {
    return new Date().toISOString();
  }
  normalized.setMinutes(0, 0, 0);
  return normalized.toISOString();
}

/**
 * Dollar-first conversion:
 * - USD stays USD
 * - ARS converts to USD using raw Binance ARS/USD
 * - Unknown currencies are treated as already-normalized USD (display safety)
 */
export function toUsdDollarFirst(
  amount: number,
  currency: string | null | undefined,
  rates: DollarFirstRates | null,
): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const curr = normalizeCurrency(currency);
  if (curr === 'USD') return amount;

  if (curr === 'ARS') {
    const binanceRate = rates?.binance;
    if (!binanceRate || !Number.isFinite(binanceRate) || binanceRate <= 0) return null;
    return amount / binanceRate;
  }

  return amount;
}

export function calculateFallbackHourlyRateUsd(pricePerDayUsd: number): number {
  if (!Number.isFinite(pricePerDayUsd) || pricePerDayUsd <= 0) return 0;
  return (pricePerDayUsd * 0.75) / 24;
}

