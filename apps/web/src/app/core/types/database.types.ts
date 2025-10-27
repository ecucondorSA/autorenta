/**
 * Database Types - Generated from Supabase Schema
 * Source: Real database verification 2025-10-16
 */

// ============================================================================
// ENUMS
// ============================================================================

export type UserRole = 'renter' | 'owner' | 'admin' | 'both';
export type CarStatus = 'draft' | 'active' | 'suspended' | 'maintenance';
export type FuelType = 'nafta' | 'gasoil' | 'hibrido' | 'electrico';
export type Transmission = 'manual' | 'automatic';
export type CancelPolicy = 'flex' | 'moderate' | 'strict';
export type BookingStatus =
  | 'pending'
  | 'pending_payment'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'expired';
export type PaymentStatus =
  | 'requires_payment'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'partial_refund'
  | 'chargeback';
export type PaymentProvider = 'mercadopago' | 'stripe' | 'otro';
export type DisputeKind = 'damage' | 'no_show' | 'late_return' | 'other';
export type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'rejected';
export type RatingRole = 'owner_rates_renter' | 'renter_rates_owner';
export type WebhookStatus = 'pending' | 'processed' | 'error';

// ============================================================================
// COMMON TYPES
// ============================================================================

/** Location data (coordinates + address) */
export interface LocationData {
  lat?: number;
  lng?: number;
  address?: string;
  city?: string;
  country?: string;
  [key: string]: unknown; // Allow additional fields
}

// ============================================================================
// TABLES
// ============================================================================

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  dni: string | null;
  country: string | null;
  avatar_url: string | null;
  email_verified: boolean | null;
  phone_verified: boolean | null;
  id_verified: boolean | null;
  stripe_customer_id: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface Car {
  id: string;
  owner_id: string;
  title: string;
  brand: string;
  model: string;
  year: number | null;
  plate: string | null;
  vin: string | null;
  transmission: Transmission;
  fuel: FuelType;
  seats: number | null;
  doors: number | null;
  color: string | null;
  mileage: number | null;
  features: Record<string, unknown>;
  description: string | null;
  status: CarStatus;
  price_per_day: number;
  currency: string;
  cancel_policy: CancelPolicy;
  location_city: string | null;
  location_state: string | null;
  location_province: string | null;
  location_country: string | null;
  location_lat: number | null;
  location_lng: number | null;
  rating_avg: number | null;
  rating_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface CarPhoto {
  id: string;
  car_id: string;
  url: string;
  position: number;
  sort_order: number | null;
  stored_path: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  car_id: string;
  renter_id: string;
  start_at: string;
  end_at: string;
  time_range: string | null;
  status: BookingStatus;
  pickup_location: LocationData | null;
  dropoff_location: LocationData | null;
  pickup_confirmed_at: string | null;
  dropoff_confirmed_at: string | null;
  pickup_confirmed_by: string | null;
  dropoff_confirmed_by: string | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  total_amount: number;
  currency: string;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  payment_method: 'credit_card' | 'wallet' | 'partial_wallet' | null;
  wallet_amount_cents: number | null;
  wallet_lock_transaction_id: string | null;
  wallet_status: 'none' | 'locked' | 'charged' | 'refunded' | null;
  wallet_charged_at: string | null;
  wallet_refunded_at: string | null;
}

export interface Payment {
  id: string;
  booking_id: string;
  provider: PaymentProvider;
  provider_payment_id: string | null;
  provider_intent_id: string | null;
  status: PaymentStatus;
  amount: number;
  fee_amount: number | null;
  net_amount: number | null;
  currency: string;
  receipt_url: string | null;
  refund_reason: string | null;
  refunded_at: string | null;
  refunded_by: string | null;
  raw: Record<string, unknown>;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  role: RatingRole;
  created_at: string;
}

export interface Dispute {
  id: string;
  booking_id: string;
  raised_by: string;
  kind: DisputeKind;
  status: DisputeStatus;
  description: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

// ============================================================================
// INSERT TYPES
// ============================================================================

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};

export type CarInsert = Omit<Car, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type BookingInsert = Omit<Booking, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type PaymentInsert = Omit<Payment, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const USER_ROLES: UserRole[] = ['renter', 'owner', 'admin', 'both'];
export const CAR_STATUSES: CarStatus[] = ['draft', 'active', 'suspended', 'maintenance'];
export const FUEL_TYPES: FuelType[] = ['nafta', 'gasoil', 'hibrido', 'electrico'];
export const TRANSMISSIONS: Transmission[] = ['manual', 'automatic'];
export const CANCEL_POLICIES: CancelPolicy[] = ['flex', 'moderate', 'strict'];
export const BOOKING_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
  'expired',
];
export const PAYMENT_STATUSES: PaymentStatus[] = [
  'requires_payment',
  'processing',
  'succeeded',
  'failed',
  'refunded',
  'partial_refund',
  'chargeback',
];

export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  CAR_IMAGES: 'car-images',
  DOCUMENTS: 'documents',
} as const;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

export function isCarStatus(value: string): value is CarStatus {
  return CAR_STATUSES.includes(value as CarStatus);
}

export function isBookingStatus(value: string): value is BookingStatus {
  return BOOKING_STATUSES.includes(value as BookingStatus);
}
