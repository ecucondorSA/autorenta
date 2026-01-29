/**
 * Booking Validators
 *
 * Provides runtime validation for booking data, especially for realtime payloads
 * that bypass TypeScript type checking.
 *
 * Usage:
 * ```typescript
 * import { validateBookingPayload, isValidBookingStatus } from '@core/utils/booking-validators';
 *
 * // In realtime handler:
 * const validation = validateBookingPayload(payload.new);
 * if (!validation.valid) {
 *   console.warn('Invalid payload:', validation.errors);
 *   return; // Reject malformed data
 * }
 * handlers.onBookingChange?.(validation.data as Booking);
 * ```
 */

import type { Booking, BookingStatus } from '@core/models';

// ==================== VALIDATION RESULT ====================

export interface ValidationResult<T = unknown> {
  valid: boolean;
  errors: string[];
  data?: T;
}

// ==================== VALID STATUS VALUES ====================

/**
 * All valid booking statuses (must match database ENUM)
 */
export const VALID_BOOKING_STATUSES: readonly BookingStatus[] = [
  'pending',
  'pending_payment',
  'pending_approval',
  'confirmed',
  'in_progress',
  'pending_review',
  'completed',
  'cancelled',
  'cancelled_owner',
  'cancelled_renter',
  'cancelled_system',
  'disputed',
  'resolved',
  'expired',
  'rejected',
  'no_show',
  'pending_dispute_resolution',
  'payment_validation_failed',
] as const;

/**
 * Valid payment modes
 */
export const VALID_PAYMENT_MODES = ['card', 'wallet', 'bank_transfer', 'split'] as const;
export type ValidPaymentMode = (typeof VALID_PAYMENT_MODES)[number];

/**
 * Valid wallet statuses
 */
export const VALID_WALLET_STATUSES = [
  'none',
  'locked',
  'charged',
  'refunded',
  'partially_charged',
] as const;

/**
 * Valid coverage upgrades
 */
export const VALID_COVERAGE_UPGRADES = ['standard', 'premium', 'zero_franchise'] as const;

/**
 * Valid distance tiers
 */
export const VALID_DISTANCE_TIERS = ['local', 'regional', 'long_distance'] as const;

// ==================== TYPE GUARDS ====================

/**
 * Check if value is a valid UUID v4
 */
export function isValidUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value,
  );
}

/**
 * Check if value is a valid booking status
 */
export function isValidBookingStatus(value: unknown): value is BookingStatus {
  if (typeof value !== 'string') return false;
  return VALID_BOOKING_STATUSES.includes(value as BookingStatus);
}

/**
 * Check if value is a valid ISO 8601 date string
 */
export function isValidISODate(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Check if value is a valid number (not NaN, not Infinity)
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Check if value is a valid positive number (>= 0)
 */
export function isValidPositiveNumber(value: unknown): value is number {
  return isValidNumber(value) && value >= 0;
}

/**
 * Check if value is a valid currency code (3 uppercase letters)
 */
export function isValidCurrencyCode(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[A-Z]{3}$/.test(value);
}

/**
 * Check if value is a valid payment mode
 */
export function isValidPaymentMode(value: unknown): value is ValidPaymentMode {
  if (typeof value !== 'string') return false;
  return VALID_PAYMENT_MODES.includes(value as ValidPaymentMode);
}

/**
 * Check if value is a valid coverage upgrade
 */
export function isValidCoverageUpgrade(value: unknown): boolean {
  if (value === null || value === undefined) return true; // Optional field
  if (typeof value !== 'string') return false;
  return VALID_COVERAGE_UPGRADES.includes(value as (typeof VALID_COVERAGE_UPGRADES)[number]);
}

/**
 * Check if value is a valid distance tier
 */
export function isValidDistanceTier(value: unknown): boolean {
  if (value === null || value === undefined) return true; // Optional field
  if (typeof value !== 'string') return false;
  return VALID_DISTANCE_TIERS.includes(value as (typeof VALID_DISTANCE_TIERS)[number]);
}

// ==================== BOOKING VALIDATION ====================

/**
 * Validate a booking payload from realtime updates
 *
 * Checks required fields and basic type validation.
 * Does NOT validate business logic (e.g., date ranges).
 */
export function validateBookingPayload(payload: unknown): ValidationResult<Booking> {
  const errors: string[] = [];

  // Check payload is object
  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Invalid payload: not an object'] };
  }

  const data = payload as Record<string, unknown>;

  // Required fields validation
  if (!isValidUUID(data['id'])) {
    errors.push('Invalid or missing booking ID');
  }

  if (!isValidUUID(data['car_id'])) {
    errors.push('Invalid or missing car_id');
  }

  if (!isValidUUID(data['renter_id']) && !isValidUUID(data['user_id'])) {
    errors.push('Invalid or missing renter_id/user_id');
  }

  if (!isValidBookingStatus(data['status'])) {
    errors.push(
      `Invalid status: "${data['status']}". Valid values: ${VALID_BOOKING_STATUSES.join(', ')}`,
    );
  }

  if (!isValidISODate(data['start_at'])) {
    errors.push('Invalid or missing start_at date');
  }

  if (!isValidISODate(data['end_at'])) {
    errors.push('Invalid or missing end_at date');
  }

  // Numeric fields validation (if present)
  if (data['total_amount'] !== undefined && !isValidNumber(data['total_amount'])) {
    errors.push('Invalid total_amount: must be a number');
  }

  if (data['total_cents'] !== undefined && !isValidPositiveNumber(data['total_cents'])) {
    errors.push('Invalid total_cents: must be a positive number');
  }

  // Currency validation
  if (data['currency'] !== undefined && !isValidCurrencyCode(data['currency'])) {
    errors.push('Invalid currency: must be 3 uppercase letters (e.g., ARS, USD)');
  }

  // Optional field type validation
  if (data['payment_mode'] !== undefined && data['payment_mode'] !== null) {
    if (!isValidPaymentMode(data['payment_mode'])) {
      errors.push(`Invalid payment_mode: "${data['payment_mode']}"`);
    }
  }

  if (!isValidCoverageUpgrade(data['coverage_upgrade'])) {
    errors.push(`Invalid coverage_upgrade: "${data['coverage_upgrade']}"`);
  }

  if (!isValidDistanceTier(data['distance_risk_tier'])) {
    errors.push(`Invalid distance_risk_tier: "${data['distance_risk_tier']}"`);
  }

  // Date range validation (if both dates present)
  if (isValidISODate(data['start_at']) && isValidISODate(data['end_at'])) {
    const start = new Date(data['start_at'] as string);
    const end = new Date(data['end_at'] as string);
    if (end <= start) {
      errors.push('Invalid date range: end_at must be after start_at');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? (data as unknown as Booking) : undefined,
  };
}

/**
 * Validate a partial booking update payload
 *
 * Less strict than full validation - only validates fields that are present.
 */
export function validatePartialBookingPayload(
  payload: unknown,
): ValidationResult<Partial<Booking>> {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Invalid payload: not an object'] };
  }

  const data = payload as Record<string, unknown>;

  // Validate fields if present
  if (data['id'] !== undefined && !isValidUUID(data['id'])) {
    errors.push('Invalid booking ID');
  }

  if (data['status'] !== undefined && !isValidBookingStatus(data['status'])) {
    errors.push(`Invalid status: "${data['status']}"`);
  }

  if (data['total_amount'] !== undefined && !isValidNumber(data['total_amount'])) {
    errors.push('Invalid total_amount');
  }

  if (data['start_at'] !== undefined && !isValidISODate(data['start_at'])) {
    errors.push('Invalid start_at date');
  }

  if (data['end_at'] !== undefined && !isValidISODate(data['end_at'])) {
    errors.push('Invalid end_at date');
  }

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? (data as Partial<Booking>) : undefined,
  };
}

// ==================== SANITIZATION ====================

/**
 * Sanitize a booking payload by removing unknown/unsafe fields
 *
 * Use this after validation to ensure only expected fields are used.
 */
export function sanitizeBookingPayload(payload: unknown): Partial<Booking> | null {
  if (!payload || typeof payload !== 'object') return null;

  const data = payload as Record<string, unknown>;
  const sanitized: Partial<Booking> = {};

  // Copy only known fields
  const knownFields = [
    'id',
    'car_id',
    'user_id',
    'renter_id',
    'owner_id',
    'start_at',
    'end_at',
    'status',
    'total_amount',
    'currency',
    'created_at',
    'updated_at',
    'days_count',
    'nightly_rate_cents',
    'subtotal_cents',
    'insurance_cents',
    'fees_cents',
    'discounts_cents',
    'total_cents',
    'payment_intent_id',
    'expires_at',
    'paid_at',
    'payment_method',
    'payment_mode',
    'authorized_payment_id',
    'wallet_lock_id',
    'coverage_upgrade',
    'wallet_amount_cents',
    'wallet_status',
    'rental_amount_cents',
    'deposit_amount_cents',
    'deposit_status',
    'returned_at',
    'owner_confirmed_delivery',
    'owner_confirmed_at',
    'has_damages',
    'damage_amount_cents',
    'damage_description',
    'renter_confirmed_payment',
    'renter_confirmed_at',
    'funds_released_at',
    'completion_status',
    'dispute_open_at',
    'dispute_status',
    'cancellation_policy_id',
    'cancellation_fee_cents',
    'cancelled_at',
    'cancellation_reason',
    'cancelled_by_role',
    'pickup_location_lat',
    'pickup_location_lng',
    'dropoff_location_lat',
    'dropoff_location_lng',
    'delivery_required',
    'delivery_distance_km',
    'delivery_fee_cents',
    'distance_risk_tier',
    'metadata',
    'has_dynamic_pricing',
    'dynamic_price_snapshot',
    'price_locked_until',
    'price_lock_token',
    // View fields
    'car_title',
    'car_brand',
    'car_model',
    'car_year',
    'main_photo_url',
    'car',
  ];

  for (const field of knownFields) {
    if (data[field] !== undefined) {
      (sanitized as Record<string, unknown>)[field] = data[field];
    }
  }

  return sanitized;
}
