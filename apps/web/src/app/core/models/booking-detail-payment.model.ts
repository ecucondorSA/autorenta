/**
 * Modelos para la página Detalle & Pago (AR)
 * AutoRenta - Sistema de booking con dos modalidades de garantía
 */

import type { CurrencyCode } from './fgo-v1-1.model';
import { type MembershipPlan, calcHoldAndBuydown, getVehicleTierByValue } from './guarantee-tiers.model';

// ============================================================================
// TIPOS BASE
// ============================================================================

export type PaymentMode = 'card' | 'wallet';

export type CoverageUpgrade = 'standard' | 'premium50' | 'zero';

export type PricingBucketType = 'economy' | 'standard' | 'premium' | 'luxury' | 'ultra-luxury';

export type CountryCode = 'AR' | 'CO' | 'MX';

// ============================================================================
// INPUT DE BOOKING
// ============================================================================

/**
 * Input inicial del usuario para crear la reserva
 */
export interface BookingInput {
  carId: string;
  startDate: Date;
  endDate: Date;
  bucket: PricingBucketType;
  vehicleValueUsd: number;
  country: CountryCode;
  userId?: string;
}

/**
 * Cálculo de días y fechas
 */
export interface BookingDates {
  startDate: Date;
  endDate: Date;
  totalDays: number;
  totalHours: number;
}

// ============================================================================
// FX SNAPSHOT
// ============================================================================

/**
 * Snapshot del tipo de cambio en un momento específico
 */
export interface FxSnapshot {
  rate: number; // ej: 1000.00 (1 USD = 1000 ARS)
  timestamp: Date;
  fromCurrency: CurrencyCode; // USD
  toCurrency: CurrencyCode; // ARS
  expiresAt: Date; // timestamp + 7 días
  isExpired: boolean;
  variationThreshold: number; // 0.10 (±10%)
}

/**
 * Versión DB del FX snapshot
 */
export interface FxSnapshotDb {
  rate: number;
  timestamp: string;
  from_currency: string;
  to_currency: string;
  expires_at: string;
}

// ============================================================================
// RISK SNAPSHOT
// ============================================================================

/**
 * Snapshot de riesgo calculado para Argentina
 */
export interface RiskSnapshot {
  // Franquicias base (USD)
  deductibleUsd: number; // Franquicia estándar por daño/robo
  rolloverDeductibleUsd: number; // Franquicia por vuelco (2× estándar)

  // Modalidad con tarjeta
  holdEstimatedArs: number; // Hold/preautorización estimado en ARS
  holdEstimatedUsd: number; // Hold en USD (referencia)

  // Modalidad sin tarjeta
  creditSecurityUsd: number; // Crédito de Seguridad requerido (según escala vigente)

  // Metadata
  bucket: PricingBucketType;
  vehicleValueUsd: number;
  country: CountryCode;
  fxRate: number;
  calculatedAt: Date;

  // Upgrade de cobertura aplicado
  coverageUpgrade: CoverageUpgrade;
}

/**
 * Parámetros para calcular risk snapshot
 */
export interface CalculateRiskSnapshotParams {
  vehicleValueUsd: number;
  bucket: PricingBucketType;
  country: CountryCode;
  fxRate: number;
  coverageUpgrade?: CoverageUpgrade;
  distanceKm?: number; // ✅ NEW: Distance for distance-based guarantees
}

/**
 * Versión persistida en DB
 */
export interface BookingDetailRiskSnapshotDb {
  id: string;
  booking_id: string;
  country_code: string;
  bucket: string;

  // FX
  fx_snapshot: number;
  currency: string;

  // Garantías estimadas
  estimated_hold_amount_ars?: number;
  estimated_credit_security_usd?: number;

  // Franquicias (USD)
  deductible_usd: number;
  rollover_deductible_usd: number;

  // Flags
  payment_mode: string;
  coverage_upgrade: string;

  // Metadata
  meta?: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// PRICE BREAKDOWN
// ============================================================================

/**
 * Desglose de precios de la reserva
 */
export interface BookingPriceBreakdown {
  // Tarifa base
  dailyRateUsd: number;
  totalDays: number;
  subtotalUsd: number;

  // Fees y cargos
  fgoContributionUsd: number; // α% (ej: 15% del subtotal)
  platformFeeUsd: number; // Fee de plataforma
  insuranceFeeUsd: number; // Seguro (si aplica)

  // Upgrades
  coverageUpgradeUsd: number; // Costo del upgrade de cobertura

  // ✅ NEW: Distance-based pricing
  deliveryFeeUsd?: number; // Fee de entrega/delivery
  distanceKm?: number; // Distancia al auto
  distanceTier?: 'local' | 'regional' | 'long_distance'; // Tier de distancia

  // Total
  totalUsd: number;
  totalArs: number;

  // FX
  fxRate: number;
}

/**
 * Parámetros para calcular pricing
 */
export interface CalculatePricingParams {
  carId: string;
  dailyRateUsd: number;
  startDate: Date;
  endDate: Date;
  bucket: PricingBucketType;
  coverageUpgrade: CoverageUpgrade;
  fxRate: number;
}

// ============================================================================
// PAYMENT AUTHORIZATION
// ============================================================================

/**
 * Autorización de pago (preautorización/hold)
 */
export interface PaymentAuthorization {
  authorizedPaymentId: string;
  amountArs: number;
  amountUsd: number;
  currency: CurrencyCode;
  expiresAt: Date;
  status: 'pending' | 'authorized' | 'expired' | 'failed';
  paymentMethodId?: string;
  cardLast4?: string;
  createdAt: Date;
}

/**
 * Resultado de autorización
 */
export interface AuthorizePaymentResult {
  ok: boolean;
  authorizedPaymentId?: string;
  expiresAt?: Date;
  error?: string;
}

// ============================================================================
// WALLET LOCK
// ============================================================================

/**
 * Bloqueo de fondos en wallet (Crédito de Seguridad)
 */
export interface WalletLock {
  lockId: string;
  userId: string;
  amountUsd: number;
  reason: string;
  status: 'locked' | 'released' | 'captured';
  isWithdrawable: boolean; // false para Crédito de Seguridad
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Resultado de lock de wallet
 */
export interface WalletLockResult {
  ok: boolean;
  lockId?: string;
  currentBalance?: number;
  requiredAmount?: number;
  error?: string;
}

// ============================================================================
// CONSENTS
// ============================================================================

/**
 * Consentimientos del usuario
 */
export interface UserConsents {
  termsAccepted: boolean;
  termsAcceptedAt?: Date;
  cardOnFileAccepted: boolean; // Solo para paymentMode='card'
  cardOnFileAcceptedAt?: Date;
  privacyPolicyAccepted: boolean;
  privacyPolicyAcceptedAt?: Date;
}

// ============================================================================
// UI STATE
// ============================================================================

/**
 * Estado de UI global de la página
 */
export interface BookingDetailPaymentState {
  // Input del usuario
  bookingInput: BookingInput | null;

  // Snapshots
  fxSnapshot: FxSnapshot | null;
  riskSnapshot: RiskSnapshot | null;

  // Pricing
  priceBreakdown: BookingPriceBreakdown | null;

  // Modalidad de pago
  paymentMode: PaymentMode;

  // Upgrade de cobertura
  coverageUpgrade: CoverageUpgrade;

  // Autorizaciones
  paymentAuthorization: PaymentAuthorization | null;
  walletLock: WalletLock | null;

  // Consentimientos
  consents: UserConsents;

  // UI
  loading: boolean;
  error: string | null;
  step: 'input' | 'authorization' | 'confirmation' | 'complete';

  // Validaciones
  canProceed: boolean;
}

// ============================================================================
// BOOKING CREATION
// ============================================================================

/**
 * Parámetros para crear booking
 */
export interface CreateBookingParams {
  bookingInput: BookingInput;
  riskSnapshotId: string;
  paymentMode: PaymentMode;

  // Si paymentMode='card'
  authorizedPaymentId?: string;

  // Si paymentMode='wallet'
  walletLockId?: string;

  // Pricing
  priceBreakdownUsd: number;
  priceBreakdownArs: number;

  // Upgrades
  coverageUpgrade: CoverageUpgrade;

  // Consents
  consents: UserConsents;

  // Idempotencia
  idempotencyKey: string;
}

/**
 * Resultado de creación de booking
 */
export interface CreateBookingResult {
  ok: boolean;
  bookingId?: string;
  riskSnapshotId?: string;
  paymentRef?: string;
  error?: string;
  voucher?: BookingVoucher;
}

/**
 * Voucher de confirmación
 */
export interface BookingVoucher {
  bookingId: string;
  confirmationCode: string;
  carName: string;
  startDate: Date;
  endDate: Date;
  totalAmountUsd: number;
  totalAmountArs: number;
  paymentMode: PaymentMode;
  deductibleUsd: number;
  createdAt: Date;
}

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

/**
 * Errores de validación
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Tipos de errores comunes
 */
export const ValidationErrorCodes = {
  FX_EXPIRED: 'fx_expired',
  FX_VARIATION_EXCEEDED: 'fx_variation_exceeded',
  PAYMENT_NOT_AUTHORIZED: 'payment_not_authorized',
  WALLET_INSUFFICIENT: 'wallet_insufficient',
  TERMS_NOT_ACCEPTED: 'terms_not_accepted',
  CARD_ON_FILE_NOT_ACCEPTED: 'card_on_file_not_accepted',
  AUTHORIZATION_EXPIRED: 'authorization_expired',
} as const;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calcula franquicia estándar por valor de vehículo (Argentina)
 */
export function calculateDeductibleUsd(vehicleValueUsd: number): number {
  if (vehicleValueUsd <= 10000) return 1000;
  if (vehicleValueUsd <= 20000) return 1500;
  if (vehicleValueUsd <= 40000) return 2000;
  return 2500;
}

/**
 * Aplica upgrade de cobertura a la franquicia
 */
export function applyUpgradeToDeductible(baseDeductible: number, upgrade: CoverageUpgrade): number {
  switch (upgrade) {
    case 'premium50':
      return baseDeductible * 0.5; // -50%
    case 'zero':
      return 0; // Franquicia cero
    case 'standard':
    default:
      return baseDeductible;
  }
}

/**
 * Calcula hold basado en el modelo canónico de garantías (guarantee-tiers.model).
 * Acepta MembershipPlan para aplicar el descuento correcto según la membresía del usuario.
 */
export function calculateTierHoldUsd(vehicleValueUsd: number, plan: MembershipPlan = 'none'): number {
  const vehicleTier = getVehicleTierByValue(vehicleValueUsd);
  return calcHoldAndBuydown(vehicleTier, plan).holdUsd;
}

/**
 * Calcula hold estimado para Argentina (modalidad con tarjeta)
 */
export function calculateHoldEstimatedArs(
  vehicleValueUsd: number,
  fxRate: number,
  bucket: PricingBucketType,
): number {
  void bucket; // deprecated: se mantiene solo para compatibilidad
  const holdUsd = calculateTierHoldUsd(vehicleValueUsd);
  return Math.round(holdUsd * fxRate);
}

/**
 * Calcula Crédito de Seguridad requerido (modalidad sin tarjeta) - USD
 */
export function calculateCreditSecurityUsd(vehicleValueUsd: number): number {
  return calculateTierHoldUsd(vehicleValueUsd);
}

/**
 * Verifica si FX está expirado
 */
export function isFxExpired(fxSnapshot: FxSnapshot): boolean {
  return fxSnapshot.isExpired || new Date() > fxSnapshot.expiresAt;
}

/**
 * Verifica si la variación de FX excede el umbral
 */
export function isFxVariationExceeded(
  oldRate: number,
  newRate: number,
  threshold: number = 0.1,
): boolean {
  const variation = Math.abs((newRate - oldRate) / oldRate);
  return variation > threshold;
}

/**
 * Calcula días totales de una reserva
 */
export function calculateTotalDays(startDate: Date, endDate: Date): number {
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Formatea monto en ARS
 */
export function formatArs(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formatea monto en USD
 */
export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Genera idempotency key único
 */
export function generateIdempotencyKey(): string {
  return `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Obtiene nombre legible del upgrade
 */
export function getCoverageUpgradeName(upgrade: CoverageUpgrade): string {
  const names: Record<CoverageUpgrade, string> = {
    standard: 'Estándar',
    premium50: 'Seguro Premium (-50% franquicia)',
    zero: 'Franquicia Cero',
  };
  return names[upgrade];
}

/**
 * Obtiene costo del upgrade (% del subtotal)
 */
export function getCoverageUpgradeCost(upgrade: CoverageUpgrade, subtotalUsd: number): number {
  switch (upgrade) {
    case 'premium50':
      return subtotalUsd * 0.1; // +10%
    case 'zero':
      return subtotalUsd * 0.2; // +20%
    case 'standard':
    default:
      return 0;
  }
}

/**
 * Valida que todos los consentimientos estén aceptados
 */
export function validateConsents(
  consents: UserConsents,
  paymentMode: PaymentMode,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!consents.termsAccepted) {
    errors.push({
      field: 'termsAccepted',
      message: 'Debe aceptar los Términos y Condiciones',
      code: ValidationErrorCodes.TERMS_NOT_ACCEPTED,
    });
  }

  if (paymentMode === 'card' && !consents.cardOnFileAccepted) {
    errors.push({
      field: 'cardOnFileAccepted',
      message: 'Debe aceptar guardar la tarjeta para cargos diferidos',
      code: ValidationErrorCodes.CARD_ON_FILE_NOT_ACCEPTED,
    });
  }

  return errors;
}

/**
 * Valida que la autorización de pago sea válida
 */
export function validatePaymentAuthorization(
  authorization: PaymentAuthorization | null,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!authorization) {
    errors.push({
      field: 'paymentAuthorization',
      message: 'No se ha autorizado el pago con tarjeta',
      code: ValidationErrorCodes.PAYMENT_NOT_AUTHORIZED,
    });
    return errors;
  }

  if (authorization.status !== 'authorized') {
    errors.push({
      field: 'paymentAuthorization',
      message: 'La autorización de pago no está activa',
      code: ValidationErrorCodes.PAYMENT_NOT_AUTHORIZED,
    });
  }

  if (new Date() > authorization.expiresAt) {
    errors.push({
      field: 'paymentAuthorization',
      message: 'La autorización de pago ha expirado',
      code: ValidationErrorCodes.AUTHORIZATION_EXPIRED,
    });
  }

  return errors;
}

/**
 * Valida que el wallet tenga saldo suficiente
 */
export function validateWalletBalance(
  currentBalance: number,
  requiredAmount: number,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (currentBalance < requiredAmount) {
    errors.push({
      field: 'walletBalance',
      message: `Saldo insuficiente. Necesita ${formatUsd(requiredAmount)} pero tiene ${formatUsd(currentBalance)}`,
      code: ValidationErrorCodes.WALLET_INSUFFICIENT,
    });
  }

  return errors;
}
