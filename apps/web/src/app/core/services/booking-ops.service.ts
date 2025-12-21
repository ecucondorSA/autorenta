import { Injectable } from '@angular/core';
import { injectSupabase } from './supabase-client.service';

export interface BookingPricingRow {
  booking_id: string;
  nightly_rate_cents: number | null;
  days_count: number | null;
  subtotal_cents: number | null;
  fees_cents: number | null;
  discounts_cents: number | null;
  insurance_cents: number | null;
  total_cents: number | null;
  breakdown: Record<string, unknown> | null;
}

export interface BookingInsuranceRow {
  booking_id: string;
  insurance_coverage_id: string | null;
  insurance_premium_total: number | null;
  guarantee_type: string | null;
  guarantee_amount_cents: number | null;
  coverage_upgrade: string | null;
}

export interface TrackingSessionRow {
  id: string;
  booking_id: string;
  active: boolean;
  started_at: string;
  ended_at: string | null;
}

export interface BookingConfirmationRow {
  booking_id: string;
  pickup_confirmed_at: string | null;
  pickup_confirmed_by: string | null;
  dropoff_confirmed_at: string | null;
  dropoff_confirmed_by: string | null;
  owner_confirmation_at: string | null;
  renter_confirmation_at: string | null;
  returned_at: string | null;
  funds_released_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BookingCancellationRow {
  booking_id: string;
  cancellation_reason: string | null;
  cancellation_fee_cents: number | null;
  cancelled_at: string | null;
  cancel_policy_id: number | null;
  cancelled_by_role?: 'renter' | 'owner' | 'system' | 'admin' | null;
}

export interface BookingPaymentRow {
  booking_id: string;
  paid_at: string | null;
  payment_method: string | null;
  payment_mode: string | null;
  wallet_status: string | null;
  deposit_status: string | null;
  wallet_charged_at: string | null;
}

@Injectable({ providedIn: 'root' })
export class BookingOpsService {
  private readonly supabase = injectSupabase();
  private readonly supabase = injectSupabase();

  async getPricing(bookingId: string): Promise<BookingPricingRow | null> {
    const { data, error } = await this.supabase
      .from('bookings_pricing')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle();
    if (error) throw error;
    return data as BookingPricingRow | null;
  }

  async getInsurance(bookingId: string): Promise<BookingInsuranceRow | null> {
    const { data, error } = await this.supabase
      .from('bookings_insurance')
      .select(
        'booking_id, insurance_coverage_id, insurance_premium_total, guarantee_type, guarantee_amount_cents, coverage_upgrade',
      )
      .eq('booking_id', bookingId)
      .maybeSingle();
    if (error) throw error;
    return data as BookingInsuranceRow | null;
  }

  async getTrackingSession(bookingId: string): Promise<TrackingSessionRow | null> {
    const { data, error } = await this.supabase
      .from('car_tracking_sessions')
      .select('id, booking_id, active, started_at, ended_at')
      .eq('booking_id', bookingId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as TrackingSessionRow | null;
  }

  async countTrackingPoints(sessionId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('car_tracking_points')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId);
    if (error) throw error;
    return count ?? 0;
  }

  async getConfirmation(bookingId: string): Promise<BookingConfirmationRow | null> {
    const { data, error } = await this.supabase
      .from('bookings_confirmation')
      .select(
        'booking_id, pickup_confirmed_at, pickup_confirmed_by, dropoff_confirmed_at, dropoff_confirmed_by, owner_confirmation_at, renter_confirmation_at, returned_at, funds_released_at, created_at, updated_at',
      )
      .eq('booking_id', bookingId)
      .maybeSingle();
    if (error) throw error;
    return data as BookingConfirmationRow | null;
  }

  async getCancellation(bookingId: string): Promise<BookingCancellationRow | null> {
    const { data, error } = await this.supabase
      .from('bookings_cancellation')
      .select(
        'booking_id, cancellation_reason, cancellation_fee_cents, cancelled_at, cancel_policy_id, cancelled_by_role',
      )
      .eq('booking_id', bookingId)
      .maybeSingle();
    if (error) throw error;
    return data as BookingCancellationRow | null;
  }

  async getPayment(bookingId: string): Promise<BookingPaymentRow | null> {
    const { data, error } = await this.supabase
      .from('bookings_payment')
      .select(
        'booking_id, paid_at, payment_method, payment_mode, wallet_status, deposit_status, wallet_charged_at',
      )
      .eq('booking_id', bookingId)
      .maybeSingle();
    if (error) throw error;
    return data as BookingPaymentRow | null;
  }
}
