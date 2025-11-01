/**
 * Database Types - Re-exported from Supabase Generated Types
 * Updated: 2025-11-01
 *
 * This file now re-exports types from the auto-generated Supabase types.
 * Custom types and enums are preserved for backward compatibility.
 */

// Re-export all types from Supabase generated types
export * from './supabase-types';

// ============================================================================
// CUSTOM ENUMS (kept for backward compatibility)
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
