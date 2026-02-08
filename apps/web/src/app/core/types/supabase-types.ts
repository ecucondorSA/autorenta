/**
 * Supabase Generated Types - Bridge File
 * Auto-generated types from Supabase database schema
 * Generated: 2025-11-01
 */

import type { Database } from './database.types';

// ============================================================================
// TABLE TYPES - Direct exports from generated types
// ============================================================================

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

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

// Wallet
export type WalletTransactionDB = Tables<'wallet_transactions'>;

// Payments
export type PaymentDB = Tables<'payments'>;

// Bank Accounts
export type BankAccountDB = Tables<'bank_accounts'>;

// Reviews
export type ReviewDB = Tables<'reviews'>;

// ============================================================================
// EXPORT DATABASE TYPE
// ============================================================================

export type { Database };
