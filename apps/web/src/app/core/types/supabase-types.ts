/**
 * Supabase Generated Types - Bridge File
 * Auto-generated types from Supabase database schema
 * Generated: 2025-11-01
 */

import { Database } from '../../../types/supabase.types';

// ============================================================================
// TABLE TYPES - Direct exports from generated types
// ============================================================================

type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row'];

// ============================================================================
// COMMONLY USED TYPES
// ============================================================================

// Profiles
export type ProfileDB = Tables<'profiles'>;
export type ProfileInsert = TablesInsert<'profiles'>;
export type ProfileUpdate = TablesUpdate<'profiles'>;

// Cars
export type CarDB = Tables<'cars'>;
export type CarInsert = TablesInsert<'cars'>;
export type CarUpdate = TablesUpdate<'cars'>;

// Bookings
export type BookingDB = Tables<'bookings'>;
export type BookingInsert = TablesInsert<'bookings'>;
export type BookingUpdate = TablesUpdate<'bookings'>;

// Wallet - Most are VIEWS not tables
// NOTE: WalletBalance is now exported from wallet.model.ts, not from the view
// The view wallet_user_aggregates has different field names than the RPC function
export type WalletBalanceDB = Views<'wallet_user_aggregates'>;
export type WalletTransactionDB = Tables<'wallet_transactions'>;
export type WalletLedgerDB = Tables<'wallet_ledger'>;

// Payments
export type PaymentDB = Tables<'payments'>;
export type PaymentAuthorizationDB = Views<'v_payment_authorizations'>;

// Bank Accounts
export type BankAccountDB = Tables<'bank_accounts'>;

// Reviews
export type ReviewDB = Tables<'reviews'>;

// ============================================================================
// EXPORT DATABASE TYPE
// ============================================================================

export type { Database };
