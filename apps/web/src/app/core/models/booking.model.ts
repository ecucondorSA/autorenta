import type { BookingStatus, PaymentStatus, PaymentProvider } from '../types/database.types';
import type { Car } from './car.model';

export interface BookingBreakdown {
  days: number;
  nightly_rate_cents: number;
  subtotal_cents: number;
  insurance_cents?: number;
  fees_cents?: number;
  discounts_cents?: number;
  deposit_cents?: number;
  total_cents: number;
  currency: string;
  lines?: Array<{ label: string; amount_cents: number }>;
}

export type BookingDepositStatus = 'none' | 'locked' | 'released' | 'charged';

export type BookingCompletionStatus =
  | 'active'
  | 'returned'
  | 'pending_owner'
  | 'pending_renter'
  | 'pending_both'
  | 'funds_released';

export interface Booking {
  id: string;
  car_id: string;
  user_id: string;
  renter_id: string;
  owner_id?: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  total_amount: number;
  currency: string;
  created_at: string;
  updated_at?: string;

  days_count?: number;
  nightly_rate_cents?: number;
  subtotal_cents?: number;
  insurance_cents?: number;
  fees_cents?: number;
  discounts_cents?: number;
  total_cents?: number;
  breakdown?: BookingBreakdown;

  payment_intent_id?: string;
  expires_at?: string;
  paid_at?: string;
  payment_method?: 'credit_card' | 'wallet' | 'partial_wallet' | null;
  payment_mode?: 'card' | 'wallet' | null;
  authorized_payment_id?: string | null;
  wallet_lock_id?: string | null;
  coverage_upgrade?: 'standard' | 'premium' | 'zero_franchise' | null;
  risk_snapshot_booking_id?: string | null;
  risk_snapshot_date?: string | null;
  wallet_amount_cents?: number | null;
  wallet_lock_transaction_id?: string | null;
  wallet_status?: 'none' | 'locked' | 'charged' | 'refunded' | 'partially_charged' | null;
  wallet_charged_at?: string | null;
  wallet_refunded_at?: string | null;

  rental_amount_cents?: number | null;
  deposit_amount_cents?: number | null;
  rental_lock_transaction_id?: string | null;
  deposit_lock_transaction_id?: string | null;
  rental_payment_transaction_id?: string | null;
  deposit_release_transaction_id?: string | null;
  deposit_status?: BookingDepositStatus | null;

  returned_at?: string | null;
  owner_confirmed_delivery?: boolean | null;
  owner_confirmation_at?: string | null;
  owner_reported_damages?: boolean | null;
  owner_damage_amount?: number | null;
  owner_damage_description?: string | null;
  renter_confirmed_payment?: boolean | null;
  renter_confirmation_at?: string | null;
  funds_released_at?: string | null;
  completion_status?: BookingCompletionStatus | null;

  cancellation_policy_id?: number;
  cancellation_fee_cents?: number;
  cancelled_at?: string;
  cancellation_reason?: string;

  pickup_location_lat?: number | null;
  pickup_location_lng?: number | null;
  dropoff_location_lat?: number | null;
  dropoff_location_lng?: number | null;
  delivery_required?: boolean | null;
  delivery_distance_km?: number | null;
  delivery_fee_cents?: number | null;
  distance_risk_tier?: 'local' | 'regional' | 'long_distance' | null;

  car_title?: string;
  car_brand?: string;
  car_model?: string;
  car_year?: number;
  car_city?: string;
  car_province?: string;
  main_photo_url?: string;
  payment_status?: PaymentStatus;
  payment_provider?: PaymentProvider;

  renter_name?: string;
  renter_avatar?: string;

  insurance_coverage_id?: string | null;
  insurance_premium_total?: number | null;
  security_deposit_amount?: number | null;
  deposit_held?: boolean | null;
  deposit_released_at?: string | null;
  has_active_claim?: boolean | null;

  insurance_coverage?: Record<string, unknown>;

  car?: Partial<Car>;
}
