/**
 * Supabase Generated Types - Bridge File
 * Auto-generated types from Supabase database schema
 * Generated: 2025-11-01
 */

import { Database } from '../../../types/supabase.types';

// ============================================================================
// TABLE TYPES - Direct exports from generated types
// ============================================================================

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row'];

// ============================================================================
// COMMONLY USED TYPES
// ============================================================================

// Profiles
export type Profile = Tables<'profiles'>;
export type ProfileInsert = TablesInsert<'profiles'>;
export type ProfileUpdate = TablesUpdate<'profiles'>;

// Cars
export type Car = Tables<'cars'>;
export type CarInsert = TablesInsert<'cars'>;
export type CarUpdate = TablesUpdate<'cars'>;

// Bookings
export type Booking = Tables<'bookings'>;
export type BookingInsert = TablesInsert<'bookings'>;
export type BookingUpdate = TablesUpdate<'bookings'>;

// Wallet - Most are VIEWS not tables
// NOTE: WalletBalance is now exported from wallet.model.ts, not from the view
// The view wallet_user_aggregates has different field names than the RPC function
export type WalletBalanceDB = Views<'wallet_user_aggregates'>;
export type WalletTransaction = Tables<'wallet_transactions'>;
export type WalletLedger = Tables<'wallet_ledger'>;

// Payments
export type Payment = Tables<'payments'>;
export type PaymentAuthorizationDB = Views<'v_payment_authorizations'>;

// Bank Accounts
export type BankAccount = Tables<'bank_accounts'>;

// Reviews
export type Review = Tables<'reviews'>;

// ============================================================================
// EXPORT DATABASE TYPE
// ============================================================================

export type { Database };
