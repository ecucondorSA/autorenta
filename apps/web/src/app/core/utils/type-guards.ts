/**
 * Type Guards - Runtime type checking functions
 *
 * Purpose: Replace unsafe `as` casts with proper type validation
 * Pattern: function isType(obj: unknown): obj is Type { ... }
 * Usage: if (isUser(data)) { /* data is guaranteed to be User */ }
 *
 * Benefits:
 * - Type safety at runtime
 * - Catch errors early
 * - Better error messages
 * - No data corruption from wrong types
 */

// ============================================================================
// User & Profile Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'locador' | 'locatario' | 'ambos' | 'admin';
  is_admin: boolean;
  created_at: string;
}

export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj &&
    typeof (obj as Record<string, unknown>).id === 'string' &&
    typeof (obj as Record<string, unknown>).email === 'string'
  );
}

export function isProfile(obj: unknown): obj is Profile {
  const profile = obj as Record<string, unknown>;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in profile &&
    'email' in profile &&
    'role' in profile &&
    typeof profile.id === 'string' &&
    typeof profile.email === 'string' &&
    ['locador', 'locatario', 'ambos', 'admin'].includes(profile.role as string)
  );
}

// ============================================================================
// Car Types
// ============================================================================

export interface CarLocation {
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface Car {
  id: string;
  owner_id: string;
  brand: string;
  model: string;
  year: number;
  license_plate: string;
  status: 'draft' | 'pending' | 'active' | 'suspended';
  location?: CarLocation;
  photos?: Array<{ id: string; url: string }>;
  created_at: string;
}

export function isCar(obj: unknown): obj is Car {
  const car = obj as Record<string, unknown>;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in car &&
    'owner_id' in car &&
    'brand' in car &&
    'model' in car &&
    'year' in car &&
    'license_plate' in car &&
    'status' in car &&
    typeof car.id === 'string' &&
    typeof car.owner_id === 'string' &&
    typeof car.brand === 'string' &&
    typeof car.model === 'string' &&
    typeof car.year === 'number' &&
    typeof car.license_plate === 'string' &&
    ['draft', 'pending', 'active', 'suspended'].includes(car.status as string)
  );
}

// ============================================================================
// Booking Types
// ============================================================================

export interface Booking {
  id: string;
  car_id: string;
  renter_id: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  total_price: number;
  created_at: string;
}

export function isBooking(obj: unknown): obj is Booking {
  const booking = obj as Record<string, unknown>;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in booking &&
    'car_id' in booking &&
    'renter_id' in booking &&
    'status' in booking &&
    typeof booking.id === 'string' &&
    typeof booking.car_id === 'string' &&
    typeof booking.renter_id === 'string' &&
    ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].includes(
      booking.status as string
    )
  );
}

// ============================================================================
// Payment Types
// ============================================================================

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
}

export interface PaymentIntent {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'requires_payment' | 'completed' | 'failed';
  created_at: string;
}

export interface PaymentSplit {
  id: string;
  payment_id: string;
  booking_id: string;
  collector_id: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export function isPayment(obj: unknown): obj is Payment {
  const payment = obj as Record<string, unknown>;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in payment &&
    'booking_id' in payment &&
    'amount' in payment &&
    'status' in payment &&
    typeof payment.id === 'string' &&
    typeof payment.booking_id === 'string' &&
    typeof payment.amount === 'number' &&
    ['pending', 'completed', 'failed', 'cancelled'].includes(payment.status as string)
  );
}

export function isPaymentIntent(obj: unknown): obj is PaymentIntent {
  const intent = obj as Record<string, unknown>;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in intent &&
    'booking_id' in intent &&
    'user_id' in intent &&
    'status' in intent &&
    typeof intent.id === 'string' &&
    typeof intent.booking_id === 'string' &&
    typeof intent.user_id === 'string' &&
    ['requires_payment', 'completed', 'failed'].includes(intent.status as string)
  );
}

export function isPaymentSplit(obj: unknown): obj is PaymentSplit {
  const split = obj as Record<string, unknown>;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in split &&
    'payment_id' in split &&
    'collector_id' in split &&
    'amount' in split &&
    typeof split.id === 'string' &&
    typeof split.payment_id === 'string' &&
    typeof split.collector_id === 'string' &&
    typeof split.amount === 'number' &&
    ['pending', 'processing', 'completed', 'failed'].includes(split.status as string)
  );
}

// ============================================================================
// Wallet Types
// ============================================================================

export interface Wallet {
  user_id: string;
  available_balance: number;
  locked_balance: number;
  currency: string;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'payout' | 'lock' | 'unlock';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export function isWallet(obj: unknown): obj is Wallet {
  const wallet = obj as Record<string, unknown>;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'user_id' in wallet &&
    'available_balance' in wallet &&
    'locked_balance' in wallet &&
    typeof wallet.user_id === 'string' &&
    typeof wallet.available_balance === 'number' &&
    typeof wallet.locked_balance === 'number'
  );
}

export function isWalletTransaction(obj: unknown): obj is WalletTransaction {
  const tx = obj as Record<string, unknown>;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in tx &&
    'user_id' in tx &&
    'type' in tx &&
    'amount' in tx &&
    typeof tx.id === 'string' &&
    typeof tx.user_id === 'string' &&
    ['deposit', 'withdrawal', 'payout', 'lock', 'unlock'].includes(tx.type as string) &&
    typeof tx.amount === 'number'
  );
}

// ============================================================================
// Payout Types
// ============================================================================

export interface BankAccount {
  id: string;
  user_id: string;
  account_number: string;
  bank_code: string;
  account_holder: string;
  account_type: 'checking' | 'savings';
  status: 'verified' | 'unverified' | 'invalid';
  created_at: string;
}

export interface Payout {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  bank_account_id: string;
  created_at: string;
}

export function isBankAccount(obj: unknown): obj is BankAccount {
  const account = obj as Record<string, unknown>;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in account &&
    'user_id' in account &&
    'account_number' in account &&
    'status' in account &&
    typeof account.id === 'string' &&
    typeof account.user_id === 'string' &&
    typeof account.account_number === 'string' &&
    ['verified', 'unverified', 'invalid'].includes(account.status as string)
  );
}

export function isPayout(obj: unknown): obj is Payout {
  const payout = obj as Record<string, unknown>;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in payout &&
    'user_id' in payout &&
    'amount' in payout &&
    'status' in payout &&
    typeof payout.id === 'string' &&
    typeof payout.user_id === 'string' &&
    typeof payout.amount === 'number' &&
    ['pending', 'processing', 'completed', 'failed'].includes(payout.status as string)
  );
}

// ============================================================================
// Generic Utility Guards
// ============================================================================

export function isRecord(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

export function isArray<T>(obj: unknown, guard: (item: unknown) => item is T): obj is T[] {
  return Array.isArray(obj) && obj.every((item) => guard(item));
}

export function isNonEmpty(str: unknown): str is string {
  return typeof str === 'string' && str.trim().length > 0;
}

export function isValidId(str: unknown): str is string {
  // UUID v4 or basic alphanumeric ID
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const alphanumericPattern = /^[a-zA-Z0-9_-]+$/;

  return (
    typeof str === 'string' &&
    (uuidPattern.test(str) || (alphanumericPattern.test(str) && str.length >= 8))
  );
}

export function isValidEmail(str: unknown): str is string {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof str === 'string' && emailPattern.test(str);
}

export function isPositiveNumber(num: unknown): num is number {
  return typeof num === 'number' && num > 0 && isFinite(num);
}

export function isNonNegativeNumber(num: unknown): num is number {
  return typeof num === 'number' && num >= 0 && isFinite(num);
}
