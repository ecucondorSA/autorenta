/**
 * Date Utilities for AutoRenta
 * Centralized date formatting, parsing, and timezone handling
 *
 * All dates in the system are stored in UTC and displayed in user's local timezone
 * Default locale: es-AR (Spanish - Argentina)
 */

// Default locale for the platform
export const DEFAULT_LOCALE = 'es-AR';

// Argentina timezone
export const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires';

/**
 * Format a date range for display
 * @example formatDateRange('2024-01-15', '2024-01-20') => '15 ene - 20 ene 2024'
 */
export function formatDateRange(
  from: string | Date,
  to: string | Date,
  options?: {
    locale?: string;
    includeYear?: boolean;
  },
): string {
  const { locale = DEFAULT_LOCALE, includeYear = true } = options || {};

  const start = new Date(from);
  const end = new Date(to);

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  const startFormat: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: !sameYear || !includeYear ? undefined : undefined,
  };

  const endFormat: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: sameMonth ? undefined : 'short',
    year: includeYear ? 'numeric' : undefined,
  };

  const startStr = start.toLocaleDateString(locale, startFormat);
  const endStr = end.toLocaleDateString(locale, endFormat);

  return `${startStr} - ${endStr}`;
}

/**
 * Format a single date for display
 * @example formatDate('2024-01-15') => '15 de enero de 2024'
 */
export function formatDate(
  date: string | Date,
  options?: {
    locale?: string;
    format?: 'short' | 'medium' | 'long' | 'full';
  },
): string {
  const { locale = DEFAULT_LOCALE, format = 'medium' } = options || {};

  const d = new Date(date);

  const formats: Record<string, Intl.DateTimeFormatOptions> = {
    short: { day: '2-digit', month: '2-digit', year: '2-digit' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  };

  return d.toLocaleDateString(locale, formats[format]);
}

/**
 * Format a date with time
 * @example formatDateTime('2024-01-15T14:30:00Z') => '15 ene 2024, 14:30'
 */
export function formatDateTime(
  date: string | Date,
  options?: {
    locale?: string;
    includeSeconds?: boolean;
  },
): string {
  const { locale = DEFAULT_LOCALE, includeSeconds = false } = options || {};

  const d = new Date(date);

  const dateFormat: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: false,
  };

  return d.toLocaleString(locale, dateFormat);
}

/**
 * Format time only
 * @example formatTime('2024-01-15T14:30:00Z') => '14:30'
 */
export function formatTime(
  date: string | Date,
  options?: {
    locale?: string;
    includeSeconds?: boolean;
  },
): string {
  const { locale = DEFAULT_LOCALE, includeSeconds = false } = options || {};

  const d = new Date(date);

  const timeFormat: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: false,
  };

  return d.toLocaleTimeString(locale, timeFormat);
}

/**
 * Format relative time (time ago)
 * @example formatRelativeTime(new Date(Date.now() - 3600000)) => 'hace 1 hora'
 */
export function formatRelativeTime(
  date: string | Date,
  options?: {
    locale?: string;
  },
): string {
  const { locale = DEFAULT_LOCALE } = options || {};

  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffSec < 60) return rtf.format(-diffSec, 'second');
  if (diffMin < 60) return rtf.format(-diffMin, 'minute');
  if (diffHour < 24) return rtf.format(-diffHour, 'hour');
  if (diffDay < 7) return rtf.format(-diffDay, 'day');
  if (diffWeek < 4) return rtf.format(-diffWeek, 'week');
  if (diffMonth < 12) return rtf.format(-diffMonth, 'month');
  return rtf.format(-diffYear, 'year');
}

/**
 * Calculate number of days between two dates
 * @example getDaysBetween('2024-01-15', '2024-01-20') => 5
 */
export function getDaysBetween(from: string | Date, to: string | Date): number {
  const start = new Date(from);
  const end = new Date(to);

  // Reset time to midnight for accurate day calculation
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffMs = end.getTime() - start.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is today
 */
export function isToday(date: string | Date): boolean {
  const d = new Date(date);
  const today = new Date();

  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if a date is in the past
 */
export function isPast(date: string | Date): boolean {
  return new Date(date).getTime() < Date.now();
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: string | Date): boolean {
  return new Date(date).getTime() > Date.now();
}

/**
 * Add days to a date
 * @example addDays('2024-01-15', 5) => Date for 2024-01-20
 */
export function addDays(date: string | Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get start of day (midnight)
 */
export function startOfDay(date: string | Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day (23:59:59.999)
 */
export function endOfDay(date: string | Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Convert to ISO string for database storage (UTC)
 */
export function toISOString(date: string | Date): string {
  return new Date(date).toISOString();
}

/**
 * Convert to date-only string (YYYY-MM-DD) for date inputs
 */
export function toDateString(date: string | Date): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Parse a date string safely (returns null if invalid)
 */
export function parseDate(dateString: string): Date | null {
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Check if two date ranges overlap
 */
export function doRangesOverlap(
  range1Start: string | Date,
  range1End: string | Date,
  range2Start: string | Date,
  range2End: string | Date,
): boolean {
  const start1 = new Date(range1Start).getTime();
  const end1 = new Date(range1End).getTime();
  const start2 = new Date(range2Start).getTime();
  const end2 = new Date(range2End).getTime();

  return start1 < end2 && end1 > start2;
}

/**
 * Get weekend dates within a range
 */
export function getWeekendsInRange(from: string | Date, to: string | Date): Date[] {
  const weekends: Date[] = [];
  const current = new Date(from);
  const end = new Date(to);

  while (current <= end) {
    const day = current.getDay();
    if (day === 0 || day === 6) {
      weekends.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return weekends;
}

/**
 * Format duration in hours/days
 * @example formatDuration(48) => '2 días'
 * @example formatDuration(5) => '5 horas'
 */
export function formatDuration(hours: number): string {
  if (hours < 24) {
    return hours === 1 ? '1 hora' : `${hours} horas`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (remainingHours === 0) {
    return days === 1 ? '1 día' : `${days} días`;
  }

  const dayStr = days === 1 ? '1 día' : `${days} días`;
  const hourStr = remainingHours === 1 ? '1 hora' : `${remainingHours} horas`;
  return `${dayStr} y ${hourStr}`;
}
