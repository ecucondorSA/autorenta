/**
 * Booking Display Utilities
 *
 * Centralizes formatting and labeling functions used across booking components.
 * Eliminates code duplication found in 7+ files.
 *
 * Usage:
 * ```typescript
 * import {
 *   getPaymentMethodLabel,
 *   getPaymentPlanLabel,
 *   formatCurrency,
 *   getBookingStatusLabel
 * } from '@core/utils/booking-utils';
 *
 * // In template or component:
 * {{ getPaymentMethodLabel(booking.payment_mode) }}
 * {{ formatCurrency(booking.total_cents, booking.currency) }}
 * ```
 */

import type { BookingStatus } from '@core/models';

// ==================== PAYMENT LABELS ====================

/**
 * Payment method display labels (Spanish)
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Tarjeta',
  credit_card: 'Tarjeta de Credito',
  wallet: 'Wallet',
  bank_transfer: 'Transferencia',
  split: 'Pago mixto',
  partial_wallet: 'Wallet + Tarjeta',
};

/**
 * Payment plan display labels (Spanish)
 */
export const PAYMENT_PLAN_LABELS: Record<string, string> = {
  full: 'Pago completo',
  split_50_50: '50% ahora, 50% al check-in',
  deposit_20: '20% ahora, resto 7 dias antes',
  partial: 'Pago parcial',
  installments: 'Cuotas',
};

/**
 * Get display label for payment method
 */
export function getPaymentMethodLabel(method: string | null | undefined): string {
  if (!method) return 'No especificado';
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

/**
 * Get display label for payment plan
 */
export function getPaymentPlanLabel(plan: string | null | undefined): string {
  if (!plan) return 'No especificado';
  return PAYMENT_PLAN_LABELS[plan] ?? plan;
}

// ==================== STATUS LABELS ====================

/**
 * Booking status display labels (Spanish)
 */
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pendiente',
  pending_payment: 'Pendiente de pago',
  pending_approval: 'Pendiente de aprobacion',
  confirmed: 'Confirmada',
  in_progress: 'En progreso',
  pending_review: 'Pendiente de revision',
  completed: 'Completada',
  cancelled: 'Cancelada',
  cancelled_owner: 'Cancelada por propietario',
  cancelled_renter: 'Cancelada por arrendatario',
  cancelled_system: 'Cancelada por sistema',
  disputed: 'En disputa',
  resolved: 'Resuelta',
  expired: 'Expirada',
  rejected: 'Rechazada',
  no_show: 'No se presento',
  pending_dispute_resolution: 'Resolucion de disputa pendiente',
  payment_validation_failed: 'Validacion de pago fallida',
};

/**
 * Booking status colors (Ionic color names)
 */
export const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
  pending: 'warning',
  pending_payment: 'warning',
  pending_approval: 'warning',
  confirmed: 'success',
  in_progress: 'primary',
  pending_review: 'warning',
  completed: 'success',
  cancelled: 'danger',
  cancelled_owner: 'danger',
  cancelled_renter: 'danger',
  cancelled_system: 'danger',
  disputed: 'danger',
  resolved: 'tertiary',
  expired: 'medium',
  rejected: 'danger',
  no_show: 'danger',
  pending_dispute_resolution: 'warning',
  payment_validation_failed: 'danger',
};

/**
 * Get display label for booking status
 */
export function getBookingStatusLabel(status: BookingStatus | string | null | undefined): string {
  if (!status) return 'Desconocido';
  return BOOKING_STATUS_LABELS[status as BookingStatus] ?? status;
}

/**
 * Get color for booking status (Ionic color name)
 */
export function getBookingStatusColor(status: BookingStatus | string | null | undefined): string {
  if (!status) return 'medium';
  return BOOKING_STATUS_COLORS[status as BookingStatus] ?? 'medium';
}

// ==================== DISTANCE TIER LABELS ====================

/**
 * Distance tier display labels with emoji
 */
export const DISTANCE_TIER_LABELS: Record<string, string> = {
  local: 'Local',
  regional: 'Regional',
  long_distance: 'Larga distancia',
};

/**
 * Distance tier badge classes (Tailwind)
 */
export const DISTANCE_TIER_BADGE_CLASSES: Record<string, string> = {
  local: 'bg-green-100 text-green-800',
  regional: 'bg-blue-100 text-blue-800',
  long_distance: 'bg-orange-100 text-orange-800',
};

/**
 * Get display label for distance tier
 */
export function getDistanceTierLabel(tier: string | null | undefined): string {
  if (!tier) return '';
  return DISTANCE_TIER_LABELS[tier] ?? tier;
}

/**
 * Get badge class for distance tier
 */
export function getDistanceTierBadgeClass(tier: string | null | undefined): string {
  if (!tier) return 'bg-gray-100 text-gray-800';
  return DISTANCE_TIER_BADGE_CLASSES[tier] ?? 'bg-gray-100 text-gray-800';
}

// ==================== CURRENCY FORMATTING ====================

/**
 * Format cents to currency string
 *
 * @param cents Amount in cents
 * @param currency Currency code (default: ARS)
 * @param options Intl.NumberFormat options
 */
export function formatCurrency(
  cents: number | null | undefined,
  currency = 'ARS',
  options?: Partial<Intl.NumberFormatOptions>,
): string {
  if (cents === null || cents === undefined) return '-';

  const amount = cents / 100;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(amount);
}

/**
 * Format amount (not cents) to currency string
 */
export function formatAmount(
  amount: number | null | undefined,
  currency = 'ARS',
): string {
  if (amount === null || amount === undefined) return '-';

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ==================== DATE FORMATTING ====================

/**
 * Format booking date range
 *
 * @param startAt Start date ISO string
 * @param endAt End date ISO string
 * @returns Formatted date range (e.g., "15 Ene - 18 Ene")
 */
export function formatBookingDateRange(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
): string {
  if (!startAt || !endAt) return '-';

  const start = new Date(startAt);
  const end = new Date(endAt);

  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
  };

  const startStr = start.toLocaleDateString('es-AR', options);
  const endStr = end.toLocaleDateString('es-AR', options);

  return `${startStr} - ${endStr}`;
}

/**
 * Format single date
 */
export function formatDate(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return '-';

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}

/**
 * Format date with time
 */
export function formatDateTime(
  date: string | Date | null | undefined,
): string {
  if (!date) return '-';

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ==================== CALCULATIONS ====================

/**
 * Calculate days count between two dates
 */
export function calculateDaysCount(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
): number {
  if (!startAt || !endAt) return 0;

  const start = new Date(startAt);
  const end = new Date(endAt);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Calculate rental duration in human-readable format
 */
export function formatDuration(days: number): string {
  if (days <= 0) return '-';
  if (days === 1) return '1 dia';
  if (days < 7) return `${days} dias`;
  if (days === 7) return '1 semana';
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    if (remainingDays === 0) {
      return `${weeks} semana${weeks > 1 ? 's' : ''}`;
    }
    return `${weeks} semana${weeks > 1 ? 's' : ''} y ${remainingDays} dia${remainingDays > 1 ? 's' : ''}`;
  }
  const months = Math.floor(days / 30);
  return `${months} mes${months > 1 ? 'es' : ''}`;
}

// ==================== INSURANCE LABELS ====================

/**
 * Insurance tier labels
 */
export const INSURANCE_TIER_LABELS: Record<string, string> = {
  basic: 'Basico',
  standard: 'Estandar',
  premium: 'Premium',
};

/**
 * Coverage upgrade labels
 */
export const COVERAGE_UPGRADE_LABELS: Record<string, string> = {
  standard: 'Estandar',
  premium: 'Premium (-50% deducible)',
  zero_franchise: 'Sin deducible (0% franquicia)',
  premium50: 'Premium (-50% deducible)',
  zero: 'Sin deducible',
};

/**
 * Get insurance tier label
 */
export function getInsuranceTierLabel(tier: string | null | undefined): string {
  if (!tier) return 'No especificado';
  return INSURANCE_TIER_LABELS[tier] ?? tier;
}

/**
 * Get coverage upgrade label
 */
export function getCoverageUpgradeLabel(upgrade: string | null | undefined): string {
  if (!upgrade) return 'Estandar';
  return COVERAGE_UPGRADE_LABELS[upgrade] ?? upgrade;
}

// ==================== COMPLETION STATUS ====================

/**
 * Completion status labels
 */
export const COMPLETION_STATUS_LABELS: Record<string, string> = {
  awaiting_return: 'Esperando devolucion',
  returned: 'Devuelto',
  awaiting_owner_confirmation: 'Esperando confirmacion del propietario',
  awaiting_renter_confirmation: 'Esperando confirmacion del arrendatario',
  funds_released: 'Fondos liberados',
  completed: 'Completado',
};

/**
 * Get completion status label
 */
export function getCompletionStatusLabel(status: string | null | undefined): string {
  if (!status) return '-';
  return COMPLETION_STATUS_LABELS[status] ?? status;
}
