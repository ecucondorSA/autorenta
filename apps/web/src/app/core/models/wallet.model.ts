/**
 * Wallet System Models
 * Interfaces para el sistema de wallet de AutorentA
 */

/**
 * Balance de wallet del usuario
 */
export interface WalletBalance {
  available_balance: number; // Fondos disponibles para usar
  locked_balance: number; // Fondos bloqueados en reservas activas
  total_balance: number; // Total (available + locked)
  currency: string; // 'USD' o 'UYU'
}

/**
 * Tipos de transacciones de wallet
 */
export type WalletTransactionType =
  | 'deposit' // Depósito de fondos
  | 'lock' // Bloqueo de fondos para garantía
  | 'unlock' // Desbloqueo de fondos
  | 'charge' // Cargo efectivo de fondos
  | 'refund' // Devolución de fondos
  | 'bonus'; // Bonificación/regalo

/**
 * Estados de transacciones de wallet
 */
export type WalletTransactionStatus =
  | 'pending' // En proceso
  | 'completed' // Completada exitosamente
  | 'failed' // Falló
  | 'refunded'; // Reembolsada

/**
 * Tipos de referencia de transacciones
 */
export type WalletReferenceType = 'booking' | 'deposit' | 'reward';

/**
 * Proveedores de pago soportados
 */
export type WalletPaymentProvider = 'mercadopago' | 'stripe' | 'bank_transfer' | 'internal';

/**
 * Transacción de wallet
 */
export interface WalletTransaction {
  id: string;
  user_id: string;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  amount: number;
  currency: string;
  reference_type?: WalletReferenceType;
  reference_id?: string;
  provider?: WalletPaymentProvider;
  provider_transaction_id?: string;
  provider_metadata?: Record<string, unknown>;
  description?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

/**
 * Respuesta de wallet_lock_funds
 */
export interface WalletLockFundsResponse {
  transaction_id: string | null;
  success: boolean;
  message: string;
  new_available_balance: number;
  new_locked_balance: number;
}

/**
 * Respuesta de wallet_unlock_funds
 */
export interface WalletUnlockFundsResponse {
  transaction_id: string | null;
  success: boolean;
  message: string;
  unlocked_amount: number;
  new_available_balance: number;
  new_locked_balance: number;
}

/**
 * Respuesta de wallet_initiate_deposit
 */
export interface WalletInitiateDepositResponse {
  transaction_id: string;
  success: boolean;
  message: string;
  payment_provider: WalletPaymentProvider;
  payment_url: string;
  status: WalletTransactionStatus;
}

/**
 * Respuesta de wallet_confirm_deposit (webhook)
 */
export interface WalletConfirmDepositResponse {
  success: boolean;
  message: string;
  new_available_balance: number;
}

/**
 * Respuesta de booking_charge_wallet_funds
 */
export interface BookingChargeWalletFundsResponse {
  success: boolean;
  message: string;
}

/**
 * Parámetros para iniciar un depósito
 */
export interface InitiateDepositParams {
  amount: number;
  provider?: WalletPaymentProvider;
  description?: string;
}

/**
 * Parámetros para bloquear fondos
 */
export interface LockFundsParams {
  booking_id: string;
  amount: number;
  description?: string;
}

/**
 * Parámetros para desbloquear fondos
 */
export interface UnlockFundsParams {
  booking_id: string;
  description?: string;
}

/**
 * Filtros para historial de transacciones
 */
export interface WalletTransactionFilters {
  type?: WalletTransactionType | WalletTransactionType[];
  status?: WalletTransactionStatus | WalletTransactionStatus[];
  reference_type?: WalletReferenceType;
  reference_id?: string;
  from_date?: Date;
  to_date?: Date;
}

/**
 * Métodos de pago para bookings
 */
export type BookingPaymentMethod =
  | 'credit_card' // 100% tarjeta de crédito
  | 'wallet' // 100% wallet
  | 'partial_wallet'; // Mix de wallet + tarjeta

/**
 * Estados de wallet en bookings
 */
export type BookingWalletStatus =
  | 'none' // No usa wallet
  | 'locked' // Fondos bloqueados
  | 'charged' // Fondos cargados
  | 'refunded'; // Fondos reembolsados

/**
 * Información de wallet en booking
 */
export interface BookingWalletInfo {
  payment_method: BookingPaymentMethod;
  wallet_amount_cents: number;
  wallet_lock_transaction_id?: string;
  wallet_status: BookingWalletStatus;
  wallet_charged_at?: string;
  wallet_refunded_at?: string;
}

/**
 * Estado de carga del wallet service
 */
export interface WalletLoadingState {
  balance: boolean;
  transactions: boolean;
  initiatingDeposit: boolean;
  lockingFunds: boolean;
  unlockingFunds: boolean;
}

/**
 * Errores del wallet service
 */
export interface WalletError {
  code: string;
  message: string;
  details?: unknown;
}
