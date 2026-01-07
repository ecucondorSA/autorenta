/**
 * Wallet System Models
 * Interfaces para el sistema de wallet de AutorentA
 *
 * Updated: 2025-11-01
 * Now imports WalletBalance, WalletTransaction, WalletLedger from Supabase-generated types
 */

// Re-export Supabase generated types
export type {
  WalletBalanceDB, WalletLedger as WalletLedgerDB, WalletTransaction as WalletTransactionDB
} from '@core/types/supabase-types';

/**
 * Balance de wallet del usuario (custom extended type)
 */
export interface WalletBalance {
  user_id: string;
  available_balance: number; // Fondos disponibles (Total - Locked)
  transferable_balance: number; // Fondos transferibles in-app (Available - Protected)
  withdrawable_balance: number; // Fondos retirables a banco (Transferable - Hold)

  // Nuevo sistema de créditos separados (Migration 20251106)
  autorentar_credit_balance: number; // Crédito Autorentar USD $300 renovable (no retirable)
  cash_deposit_balance: number; // Depósitos en efectivo (no retirables)

  // DEPRECATED: Sum of autorentar_credit + cash_deposit for backward compatibility
  /** @deprecated Use autorentar_credit_balance and cash_deposit_balance instead */
  protected_credit_balance: number;

  locked_balance: number; // Fondos bloqueados en reservas activas
  total_balance: number; // Total (available + locked)
  currency: string; // 'USD' o 'UYU'

  // DEPRECATED: Backward compatibility - será removido
  /** @deprecated Use protected_credit_balance instead */
  non_withdrawable_balance?: number;
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
  | 'bonus' // Bonificación/regalo
  // Tipos para pagos de alquiler y depósito
  | 'rental_payment_lock' // Bloqueo del pago del alquiler
  | 'rental_payment_transfer' // Transferencia del pago al propietario
  | 'security_deposit_lock' // Bloqueo de la garantía
  | 'security_deposit_release' // Liberación de la garantía al usuario
  | 'security_deposit_charge' // Cargo por daños de la garantía
  // Tipos para sistema de retiros
  | 'withdrawal'; // Retiro de fondos a cuenta bancaria

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
export type WalletReferenceType =
  | 'booking' // Reserva/booking
  | 'deposit' // Depósito normal
  | 'reward' // Bonificación/recompensa
  | 'credit_protected' // Crédito Autorentar (no retirable, meta inicial USD 300)
  | 'transfer' // Transferencia entre usuarios
  | 'withdrawal'; // Retiro a cuenta bancaria

/**
 * Proveedores de pago soportados
 */
export type WalletPaymentProvider = 'mercadopago' | 'stripe' | 'bank_transfer' | 'internal';

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
  success: boolean;
  message?: string;
  transaction_id: string;
  amount: number;
  currency: string;
  provider: string;
  payment_url?: string;
  payment_mobile_deep_link?: string;
  init_point?: string;
  preference_id?: string;
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
  /** Si true, los fondos serán retirables. Si false, será Crédito Autorentar (no retirable) */
  allowWithdrawal?: boolean;
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

/**
 * Respuesta de wallet_lock_rental_and_deposit
 */
export interface WalletLockRentalAndDepositResponse {
  success: boolean;
  message: string;
  rental_lock_transaction_id: string | null;
  deposit_lock_transaction_id: string | null;
  total_locked: number;
  new_available_balance: number;
  new_locked_balance: number;
}

/**
 * Respuesta de wallet_complete_booking (sin daños)
 */
export interface WalletCompleteBookingResponse {
  success: boolean;
  message: string;
  rental_payment_transaction_id: string | null;
  deposit_release_transaction_id: string | null;
  platform_fee_transaction_id: string | null;
  amount_to_owner: number;
  amount_to_renter: number;
  platform_fee: number;
}

/**
 * Respuesta de wallet_complete_booking_with_damages
 */
export interface WalletCompleteBookingWithDamagesResponse {
  success: boolean;
  message: string;
  rental_payment_transaction_id: string | null;
  damage_charge_transaction_id: string | null;
  deposit_release_transaction_id: string | null;
  platform_fee_transaction_id: string | null;
  amount_to_owner: number;
  damage_charged: number;
  amount_returned_to_renter: number;
  platform_fee: number;
}

/**
 * Parámetros para bloquear rental + deposit
 */
export interface LockRentalAndDepositParams {
  booking_id: string;
  rental_amount: number;
  deposit_amount?: number; // Default $250
}

/**
 * Parámetros para completar booking con daños
 */
export interface CompleteBookingWithDamagesParams {
  booking_id: string;
  damage_amount: number;
  damage_description: string;
}

/**
 * Estados de depósito en bookings
 */
export type BookingDepositStatus =
  | 'none' // Sin garantía
  | 'locked' // Garantía bloqueada
  | 'released' // Garantía liberada al usuario
  | 'partially_charged' // Garantía parcialmente cobrada por daños
  | 'fully_charged'; // Garantía completamente cobrada por daños

// ============================================================================
// WITHDRAWAL SYSTEM - Sistema de Retiros
// ============================================================================

/**
 * Tipos de cuenta bancaria soportados
 */
export type BankAccountType = 'cbu' | 'cvu' | 'alias';

/**
 * Cuenta bancaria del usuario para retiros
 */
export interface BankAccount {
  id: string;
  user_id: string;
  account_type: BankAccountType;
  account_number: string; // CBU/CVU o Alias
  account_holder_name: string;
  account_holder_document?: string; // DNI/CUIT (DEPRECATED: Use gov_id_number from UserProfile)
  bank_name?: string | null;
  is_verified: boolean;
  verified_at?: string | null;
  verification_method?: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Estados de solicitudes de retiro
 */
export type WithdrawalStatus =
  | 'pending' // Esperando aprobación
  | 'approved' // Aprobada, lista para procesar
  | 'processing' // En proceso de transferencia
  | 'completed' // Transferencia exitosa
  | 'failed' // Transferencia falló
  | 'rejected' // Rechazada por admin
  | 'cancelled'; // Cancelada por usuario

/**
 * Solicitud de retiro
 */
export interface WithdrawalRequest {
  id: string;
  user_id: string;
  bank_account_id: string;
  amount: number;
  currency: string;
  fee_amount: number;
  net_amount: number;
  status: WithdrawalStatus;
  provider?: string | null;
  provider_transaction_id?: string | null;
  provider_metadata?: Record<string, unknown> | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  processed_at?: string | null;
  completed_at?: string | null;
  failed_at?: string | null;
  failure_reason?: string | null;
  wallet_transaction_id?: string | null;
  user_notes?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields
  bank_account?: BankAccount;
  user_name?: string;
  user_email?: string;
}

/**
 * Parámetros para solicitar retiro
 */
export interface RequestWithdrawalParams {
  bank_account_id: string;
  amount: number;
  user_notes?: string;
}

/**
 * Respuesta de wallet_request_withdrawal
 */
export interface WalletRequestWithdrawalResponse {
  success: boolean;
  message: string;
  request_id: string | null;
  fee_amount: number;
  net_amount: number;
  new_available_balance: number;
}

/**
 * Respuesta de wallet_approve_withdrawal
 */
export interface WalletApproveWithdrawalResponse {
  success: boolean;
  message: string;
  provider: string;
  amount: number;
  recipient: string;
}

/**
 * Respuesta de wallet_complete_withdrawal
 */
export interface WalletCompleteWithdrawalResponse {
  success: boolean;
  message: string;
  wallet_transaction_id: string | null;
}

/**
 * Parámetros para aprobar retiro
 */
export interface ApproveWithdrawalParams {
  request_id: string;
  admin_notes?: string;
}

/**
 * Parámetros para rechazar retiro
 */
export interface RejectWithdrawalParams {
  request_id: string;
  rejection_reason: string;
}

/**
 * Parámetros para agregar cuenta bancaria
 */
export interface AddBankAccountParams {
  account_type: BankAccountType;
  account_number: string;
  account_holder_name: string;
  account_holder_document: string;
  bank_name?: string;
}

/**
 * Filtros para historial de retiros
 */
export interface WithdrawalFilters {
  status?: WithdrawalStatus | WithdrawalStatus[];
  from_date?: Date;
  to_date?: Date;
}

/**
 * Estado de carga para withdrawal operations
 */
export interface WithdrawalLoadingState {
  requesting: boolean;
  approving: boolean;
  rejecting: boolean;
  fetchingRequests: boolean;
  addingBankAccount: boolean;
  fetchingBankAccounts: boolean;
}

// ============================================================================
// CONSOLIDATED WALLET HISTORY - Vista Unificada (Migration 009)
// ============================================================================

/**
 * Sistema de origen de la transacción
 * Indica de dónde proviene el dato en la vista consolidada
 */
export type WalletHistorySourceSystem =
  | 'legacy' // Solo en wallet_transactions (sistema anterior)
  | 'ledger' // Solo en wallet_ledger (sistema nuevo de doble partida)
  | 'both'; // Migrada: existe en ambos sistemas

/**
 * Entry de la vista consolidada v_wallet_history
 *
 * Esta interfaz representa una transacción de wallet que puede provenir de:
 * - wallet_transactions (sistema legacy, deprecated)
 * - wallet_ledger (sistema nuevo de doble partida)
 * - Ambos (transacción migrada)
 *
 * Creada en: Migration 009 (2025-10-22)
 * Vista SQL: v_wallet_history
 * Uso: WalletService.getTransactions() usa esta vista internamente
 */
export interface WalletHistoryEntry {
  // Campos principales normalizados
  id: string;
  user_id: string;
  transaction_date: string; // TIMESTAMPTZ
  transaction_type: string; // Normalizado de type (legacy) o kind (ledger)
  status: string; // 'pending' | 'completed' | 'failed' | 'refunded'

  // Monto (siempre en centavos para consistencia)
  amount_cents: number; // BIGINT
  currency: string; // 'USD' | 'UYU' | 'ARS'

  // Metadata unificada (JSONB)
  metadata: {
    description?: string;
    reference_type?: WalletReferenceType;
    reference_id?: string;
    provider?: WalletPaymentProvider;
    provider_transaction_id?: string;
    provider_metadata?: Record<string, unknown>;
    admin_notes?: string;
    is_withdrawable?: boolean;
    [key: string]: unknown; // Campos adicionales específicos de ledger/legacy
  };

  // Referencias
  booking_id?: string; // UUID

  // Sistema de origen (para debugging y migración)
  source_system: WalletHistorySourceSystem;

  // IDs originales (para traceability)
  legacy_transaction_id?: string; // UUID si proviene de wallet_transactions
  ledger_entry_id?: string; // UUID si proviene de wallet_ledger
  ledger_ref?: string; // Ref de idempotencia (solo ledger)

  // Timestamps
  legacy_completed_at?: string; // completed_at de wallet_transactions
  ledger_created_at?: string; // created_at de wallet_ledger
}

/**
 * Estadísticas de migración legacy → ledger
 * Retornada por: get_wallet_migration_stats() RPC function
 */
export interface WalletMigrationStats {
  total_legacy_transactions: number; // Total en wallet_transactions
  migrated_to_ledger: number; // Ya migradas (source_system = 'both')
  pending_migration: number; // Pendientes (source_system = 'legacy')
  ledger_only_entries: number; // Solo en ledger (source_system = 'ledger')
  migration_percentage: number; // % de progreso (0-100)
}

// ============================================================================
// EXPIRING CREDITS - Créditos por Vencer
// ============================================================================

/**
 * Crédito que está próximo a vencer
 * Usado para mostrar alertas al usuario
 */
export interface ExpiringCredit {
  user_id: string;
  transaction_id: string;
  amount_cents: number;
  expires_at: string;
  days_until_expiry: number;
  description?: string;
  credit_type?: 'autorentar' | 'promotional' | 'refund';
}
