import type { UserRole } from '../types/database.types';

// Re-export Supabase types for use throughout the app
export type {
  Profile,
  Car as CarDB,
  Booking as BookingDB,
  WalletBalance,
  WalletTransaction as WalletTransactionDB,
  WalletLedger,
  Payment as PaymentDB,
  PaymentAuthorization,
  BankAccount as BankAccountDB,
  Review as ReviewDB,
} from '../types/supabase-types';

// Re-export database enums
export type {
  CarStatus,
  FuelType,
  Transmission,
  CancelPolicy,
  BookingStatus,
  PaymentStatus,
  PaymentProvider,
} from '../types/database.types';

// Backward compatibility
export type Role = UserRole;

// Re-export from domain model files
export * from './user.model';
export * from './car.model';
export * from './booking.model';
export * from './payment.model';
export * from './review.model';
export * from './wallet.model';
export * from './bonus-malus.model';
export * from './fgo.model';
export * from './insurance.model';
