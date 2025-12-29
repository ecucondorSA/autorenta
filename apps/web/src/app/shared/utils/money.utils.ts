/**
 * Money Utilities for AutoRenta
 * Centralized currency formatting and calculations
 *
 * Supports: USD (primary), ARS (Argentine Peso)
 * All amounts are stored in cents to avoid floating point issues
 */

// Supported currencies
export type Currency = 'USD' | 'ARS' | 'BRL';

// Currency configurations
export const CURRENCY_CONFIG: Record<Currency, {
  code: string;
  symbol: string;
  locale: string;
  decimals: number;
  thousandsSeparator: string;
  decimalSeparator: string;
}> = {
  USD: {
    code: 'USD',
    symbol: '$',
    locale: 'en-US',
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  ARS: {
    code: 'ARS',
    symbol: '$',
    locale: 'es-AR',
    decimals: 2,
    thousandsSeparator: '.',
    decimalSeparator: ',',
  },
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    locale: 'pt-BR',
    decimals: 2,
    thousandsSeparator: '.',
    decimalSeparator: ',',
  },
};

/**
 * Format a monetary amount for display
 * @example formatMoney(1234.56, 'USD') => '$1,234.56'
 * @example formatMoney(1234.56, 'ARS') => '$1.234,56'
 */
export function formatMoney(
  amount: number,
  currency: Currency = 'USD',
  options?: {
    showCurrencyCode?: boolean;
    showDecimals?: boolean;
    compact?: boolean;
  }
): string {
  const { showCurrencyCode = false, showDecimals = true, compact = false } = options || {};
  const config = CURRENCY_CONFIG[currency];

  if (compact && amount >= 1000) {
    return formatCompactMoney(amount, currency);
  }

  const formattedAmount = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: showDecimals ? config.decimals : 0,
    maximumFractionDigits: showDecimals ? config.decimals : 0,
  }).format(amount);

  if (showCurrencyCode) {
    return `${formattedAmount} ${currency}`;
  }

  return formattedAmount;
}

/**
 * Format money in compact form
 * @example formatCompactMoney(1500, 'USD') => '$1.5K'
 * @example formatCompactMoney(1500000, 'USD') => '$1.5M'
 */
export function formatCompactMoney(amount: number, currency: Currency = 'USD'): string {
  const config = CURRENCY_CONFIG[currency];

  const formatted = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);

  return formatted;
}

/**
 * Format money without currency symbol (just the number)
 * @example formatMoneyValue(1234.56, 'USD') => '1,234.56'
 */
export function formatMoneyValue(
  amount: number,
  currency: Currency = 'USD',
  options?: { showDecimals?: boolean }
): string {
  const { showDecimals = true } = options || {};
  const config = CURRENCY_CONFIG[currency];

  return new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: showDecimals ? config.decimals : 0,
    maximumFractionDigits: showDecimals ? config.decimals : 0,
  }).format(amount);
}

/**
 * Convert cents to dollars/pesos
 * @example centsToUnits(12345) => 123.45
 */
export function centsToUnits(cents: number): number {
  return cents / 100;
}

/**
 * Convert dollars/pesos to cents
 * @example unitsToCents(123.45) => 12345
 */
export function unitsToCents(units: number): number {
  return Math.round(units * 100);
}

/**
 * Format cents as money
 * @example formatCents(12345, 'USD') => '$123.45'
 */
export function formatCents(
  cents: number,
  currency: Currency = 'USD',
  options?: { showDecimals?: boolean }
): string {
  return formatMoney(centsToUnits(cents), currency, options);
}

/**
 * Calculate percentage of an amount
 * @example calculatePercentage(1000, 15) => 150
 */
export function calculatePercentage(amount: number, percentage: number): number {
  return (amount * percentage) / 100;
}

/**
 * Calculate platform fee (15% standard)
 * @example calculatePlatformFee(1000) => 150
 */
export function calculatePlatformFee(amount: number, feePercentage: number = 15): number {
  return calculatePercentage(amount, feePercentage);
}

/**
 * Calculate owner payout (amount minus platform fee)
 * @example calculateOwnerPayout(1000, 15) => 850
 */
export function calculateOwnerPayout(amount: number, feePercentage: number = 15): number {
  return amount - calculatePlatformFee(amount, feePercentage);
}

/**
 * Apply FX rate to convert between currencies
 * @example applyFxRate(100, 1000) => 100000 (100 USD * 1000 ARS/USD)
 */
export function applyFxRate(amount: number, rate: number): number {
  return amount * rate;
}

/**
 * Parse a money string to number
 * @example parseMoney('$1,234.56') => 1234.56
 * @example parseMoney('$1.234,56', 'ARS') => 1234.56
 */
export function parseMoney(value: string, currency: Currency = 'USD'): number | null {
  if (!value) return null;

  const config = CURRENCY_CONFIG[currency];

  // Remove currency symbol and whitespace
  let cleaned = value.replace(/[^0-9.,-]/g, '').trim();

  // Handle different decimal separators
  if (config.decimalSeparator === ',') {
    // Replace thousands separator (.) with nothing, then decimal separator (,) with .
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Remove thousands separator (,)
    cleaned = cleaned.replace(/,/g, '');
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Round money to avoid floating point issues
 * @example roundMoney(123.456) => 123.46
 */
export function roundMoney(amount: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor) / factor;
}

/**
 * Check if amount is valid (positive, finite number)
 */
export function isValidAmount(amount: number): boolean {
  return typeof amount === 'number' && isFinite(amount) && amount >= 0;
}

/**
 * Format price range
 * @example formatPriceRange(50, 150, 'USD') => '$50 - $150'
 */
export function formatPriceRange(
  min: number,
  max: number,
  currency: Currency = 'USD'
): string {
  const minFormatted = formatMoney(min, currency, { showDecimals: false });
  const maxFormatted = formatMoney(max, currency, { showDecimals: false });
  return `${minFormatted} - ${maxFormatted}`;
}

/**
 * Format daily rate
 * @example formatDailyRate(75, 'USD') => '$75/día'
 */
export function formatDailyRate(amount: number, currency: Currency = 'USD'): string {
  const formatted = formatMoney(amount, currency, { showDecimals: false });
  return `${formatted}/día`;
}

/**
 * Calculate total rental cost
 * @example calculateRentalTotal(75, 5) => 375
 */
export function calculateRentalTotal(dailyRate: number, days: number): number {
  return roundMoney(dailyRate * days);
}

/**
 * Calculate discounted price
 * @example calculateDiscountedPrice(100, 10) => 90
 */
export function calculateDiscountedPrice(originalPrice: number, discountPercentage: number): number {
  return roundMoney(originalPrice * (1 - discountPercentage / 100));
}

/**
 * Format savings amount
 * @example formatSavings(50, 'USD') => 'Ahorrás $50'
 */
export function formatSavings(amount: number, currency: Currency = 'USD'): string {
  const formatted = formatMoney(amount, currency, { showDecimals: false });
  return `Ahorrás ${formatted}`;
}

/**
 * Split amount into equal parts (for payment plans)
 * @example splitAmount(1000, 3) => [333.34, 333.33, 333.33]
 */
export function splitAmount(totalAmount: number, parts: number): number[] {
  if (parts <= 0) return [];
  if (parts === 1) return [totalAmount];

  const baseAmount = Math.floor(totalAmount * 100 / parts) / 100;
  const remainder = roundMoney(totalAmount - baseAmount * parts);

  const result: number[] = [];
  for (let i = 0; i < parts; i++) {
    result.push(i === 0 ? roundMoney(baseAmount + remainder) : baseAmount);
  }

  return result;
}
