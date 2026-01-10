/**
 * Utility functions for PDF generation
 */

/**
 * Convert cents to currency units
 */
export function centsToUnits(cents: number): number {
  return cents / 100;
}

/**
 * Format currency with symbol
 */
export function formatCurrency(cents: number, currency: string): string {
  const amount = centsToUnits(cents);

  const symbols: Record<string, string> = {
    USD: '$',
    ARS: 'AR$',
    BRL: 'R$',
  };

  const locales: Record<string, string> = {
    USD: 'en-US',
    ARS: 'es-AR',
    BRL: 'pt-BR',
  };

  const symbol = symbols[currency] || '$';
  const locale = locales[currency] || 'en-US';

  try {
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    return `${symbol} ${formatted}`;
  } catch {
    return `${symbol} ${amount.toFixed(2)}`;
  }
}

/**
 * Format date in readable format
 */
export function formatDate(isoDate: string, includeTime = false): string {
  try {
    const date = new Date(isoDate);

    if (includeTime) {
      return date.toLocaleString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
      });
    }

    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires',
    });
  } catch {
    return isoDate;
  }
}

/**
 * Generate a unique reference number
 */
export function generateReference(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Truncate text to max length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Calculate days between two dates
 */
export function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
