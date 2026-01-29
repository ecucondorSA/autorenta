/**
 * Modelos FGO v1.1 (Extensión de FGO v1.0)
 * AutoRenta - Sistema de contabilidad del fondo de garantía
 *
 * NUEVAS FUNCIONALIDADES v1.1:
 * - Parámetros dinámicos por país/bucket
 * - PEM (Pérdida Esperada Mensual)
 * - Waterfall automatizado de cobros
 * - Gates de solvencia
 * - Evidencias estructuradas
 * - Multimoneda con FX
 */

import { FgoHealthStatus, centsToUsd } from './fgo.model';

// ============================================================================
// TIPOS ADICIONALES v1.1
// ============================================================================

export type BucketType = 'economy' | 'premium' | 'luxury' | 'default';

export type InspectionStage = 'check_in' | 'check_out' | 'renter_check_in';

export type CurrencyCode = 'USD' | 'ARS' | 'COP' | 'MXN';

// ============================================================================
// PARÁMETROS FGO
// ============================================================================

/**
 * Parámetros operativos del FGO por país/bucket
 * Corresponde a la tabla fgo_parameters
 */
export interface FgoParameters {
  id: string;
  countryCode: string;
  bucket: BucketType;

  // Alpha dinámico
  alpha: number; // α actual (0.0 - 1.0)
  alphaMin: number; // Mínimo permitido
  alphaMax: number; // Máximo permitido

  // Umbrales RC
  rcFloor: number; // RC mínimo (default: 0.90)
  rcHardFloor: number; // RC crítico (default: 0.80)
  rcSoftCeiling: number; // RC alto (default: 1.20)

  // Umbrales LR
  lossRatioTarget: number; // LR objetivo (default: 0.80)

  // Límites operativos
  monthlyPayoutCap: number; // % del saldo (default: 0.08 = 8%)
  perUserLimit: number; // Eventos por trimestre (default: 2)
  eventCapUsd: number; // Tope por evento en USD (default: 800)

  updatedAt: Date;
}

/**
 * Versión DB de FgoParameters
 */
export interface FgoParametersDb {
  id: string;
  country_code: string;
  bucket: string;
  alpha: number;
  alpha_min: number;
  alpha_max: number;
  rc_floor: number;
  rc_hard_floor: number;
  rc_soft_ceiling: number;
  loss_ratio_target: number;
  monthly_payout_cap: number;
  per_user_limit: number;
  event_cap_usd: number;
  updated_at: string;
}

// ============================================================================
// SNAPSHOT DE RIESGO POR BOOKING
// ============================================================================

/**
 * Snapshot de riesgo capturado al crear el booking
 * Incluye FX rate del momento y garantías estimadas
 */
export interface BookingRiskSnapshot {
  bookingId: string;
  countryCode: string;
  bucket: BucketType;

  // FX
  fxSnapshot: number; // Tipo de cambio a USD
  currency: CurrencyCode; // Moneda original

  // Garantías estimadas (moneda local)
  estimatedHoldAmount?: number;
  estimatedDeposit?: number;

  // Payment authorization ID for partial capture
  authorizedPaymentId?: string;

  // Franquicia (USD)
  franchiseUsd: number;

  // Flags
  hasCard: boolean;
  hasWalletSecurity: boolean;

  // Metadata
  meta?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Versión DB de BookingRiskSnapshot
 */
export interface BookingRiskSnapshotDb {
  id?: string;
  booking_id: string;
  country_code: string;
  bucket: string;
  fx_snapshot: number;
  currency: string;
  estimated_hold_amount?: number;
  estimated_deposit?: number;
  authorized_payment_id?: string;
  franchise_usd: number;
  rollover_franchise_usd?: number | null;
  coverage_upgrade?: string | null;
  has_card: boolean;
  has_wallet_security: boolean;
  meta?: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// INSPECCIONES DE VEHÍCULO
// ============================================================================

/**
 * Evidencia fotográfica individual
 */
export interface InspectionPhoto {
  url: string;
  type: 'exterior' | 'interior' | 'odometer' | 'damage' | 'other';
  caption?: string;
  timestamp?: string;
}

/**
 * Inspección completa de vehículo (check-in o check-out)
 */
export interface BookingInspection {
  id: string;
  bookingId: string;
  stage: InspectionStage;
  inspectorId: string;

  // Evidencias
  photos: InspectionPhoto[];
  odometer?: number; // Kilómetros
  fuelLevel?: number; // 0.0 - 100.0
  latitude?: number;
  longitude?: number;

  // Firma
  signedAt?: Date;

  createdAt: Date;
}

/**
 * Versión DB de BookingInspection
 */
export interface BookingInspectionDb {
  id: string;
  booking_id: string;
  stage: string;
  inspector_id: string;
  photos: InspectionPhoto[]; // JSONB
  odometer?: number;
  fuel_level?: number;
  latitude?: number;
  longitude?: number;
  signed_at?: string;
  created_at: string;
}

// ============================================================================
// MÉTRICAS EXTENDIDAS v1.1
// ============================================================================

/**
 * Estado extendido del FGO con métricas v1.1
 * Extiende FgoStatus con campos adicionales
 */
export interface FgoStatusV1_1 {
  // Campos v1.0 (todos incluidos)
  liquidityBalance: number;
  capitalizationBalance: number;
  profitabilityBalance: number;
  totalBalance: number;
  alphaPercentage: number;
  targetMonthsCoverage: number;
  totalContributions: number;
  totalSiniestrosPaid: number;
  totalSiniestrosCount: number;
  coverageRatio: number | null;
  lossRatio: number | null;
  targetBalance: number | null;
  status: FgoHealthStatus;

  // 🆕 Campos v1.1
  pemCents: number | null; // PEM en centavos
  pem: number | null; // PEM en USD
  lr90d: number | null; // Loss Ratio 90 días
  lr365d: number | null; // Loss Ratio 365 días
  totalEvents90d: number; // Eventos en 90 días
  avgRecoveryRate: number | null; // Tasa de recupero (0.0 - 1.0)

  lastCalculatedAt: Date;
  updatedAt: Date;
}

/**
 * Resultado de cálculo de PEM
 */
export interface PemCalculation {
  countryCode: string;
  bucket: BucketType;
  pemCents: number;
  pem: number; // USD
  eventCount: number;
  avgEventCents: number;
  avgEvent: number; // USD
  totalPaid: number; // USD
  totalRecovered: number; // USD
}

/**
 * Resultado de cálculo de RC v1.1
 */
export interface RcCalculationV1_1 {
  pemCents: number;
  pem: number; // USD
  currentBalanceCents: number;
  currentBalance: number; // USD
  targetBalanceCents: number;
  targetBalance: number; // USD
  rc: number | null;
  eventCount: number;
  status: FgoHealthStatus;
  calculatedAt: Date;
}

/**
 * Resultado de ajuste de alpha
 */
export interface AlphaAdjustment {
  countryCode: string;
  bucket: BucketType;
  rc: number | null;
  previousAlpha: number;
  newAlpha: number;
  adjusted: boolean;
  adjustmentDelta: number;
  timestamp: Date;
}

// ============================================================================
// ELIGIBILITY Y WATERFALL
// ============================================================================

/**
 * Resultado de evaluación de elegibilidad
 */
export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  rc: number | null;
  rcStatus: FgoHealthStatus;
  franchisePercentage: number; // % franquicia interna
  maxCoverCents: number;
  maxCoverUsd: number;
  eventCapUsd: number;
  monthlyPayoutUsedCents: number;
  monthlyCapCents: number;
  userEventsQuarter: number;
  userEventLimit: number;
  fgoBalanceCents: number;
  snapshot: {
    countryCode: string;
    bucket: BucketType;
    currency: CurrencyCode;
    fxSnapshot: number;
  };
}

/**
 * Breakdown del waterfall de cobros
 */
export interface WaterfallBreakdown {
  holdCaptured: number; // centavos
  walletDebited: number; // centavos
  extraCharged: number; // centavos
  fgoPaid: number; // centavos
  remainingUncovered: number; // centavos
}

/**
 * Resultado de ejecución de waterfall
 */
export interface WaterfallResult {
  ok: boolean;
  error?: string;
  bookingId: string;
  totalClaimCents: number;
  breakdown: WaterfallBreakdown;
  fgoMovementId?: string;
  fgoRef?: string;
  eligibility: EligibilityResult;
  executedAt: Date;
}

// ============================================================================
// PARÁMETROS PARA RPCs
// ============================================================================

/**
 * Parámetros para crear snapshot de riesgo
 */
export interface CreateRiskSnapshotParams {
  bookingId: string;
  countryCode: string;
  bucket: BucketType;
  fxSnapshot: number;
  currency: CurrencyCode;
  estimatedHoldAmount?: number;
  estimatedDeposit?: number;
  franchiseUsd: number;
  hasCard: boolean;
  hasWalletSecurity: boolean;
}

/**
 * Parámetros para crear inspección
 */
export interface CreateInspectionParams {
  bookingId: string;
  stage: InspectionStage;
  inspectorId: string;
  photos: InspectionPhoto[];
  odometer?: number;
  fuelLevel?: number;
  latitude?: number;
  longitude?: number;
}

/**
 * Parámetros para evaluar elegibilidad
 */
export interface AssessEligibilityParams {
  bookingId: string;
  claimAmountCents: number;
}

/**
 * Parámetros para ejecutar waterfall
 */
export interface ExecuteWaterfallParams {
  bookingId: string;
  totalClaimCents: number;
  description: string;
  evidenceUrl?: string;
}

/**
 * Parámetros para actualizar parámetros FGO
 */
export interface UpdateParametersParams {
  countryCode: string;
  bucket: BucketType;
  alpha?: number;
  rcFloor?: number;
  eventCapUsd?: number;
  perUserLimit?: number;
}

// ============================================================================
// HELPERS Y UTILIDADES
// ============================================================================

// (Funciones centsToUsd y usdToCents eliminadas para evitar ambigüedad en el máster barrel, importadas arriba)

/**
 * Formatea alpha como porcentaje
 */
export function formatAlpha(alpha: number): string {
  return `${(alpha * 100).toFixed(2)}%`;
}

/**
 * Formatea RC con 2 decimales
 */
export function formatRc(rc: number | null): string {
  if (rc === null) return 'N/A';
  return rc.toFixed(2);
}

/**
 * Obtiene el nombre legible de un bucket
 */
export function getBucketName(bucket: BucketType): string {
  const names: Record<BucketType, string> = {
    economy: 'Económico',
    default: 'Estándar',
    premium: 'Premium',
    luxury: 'Lujo',
  };
  return names[bucket] || bucket;
}

/**
 * Obtiene el color de un bucket
 */
export function getBucketColor(bucket: BucketType): string {
  const colors: Record<BucketType, string> = {
    economy: 'blue',
    default: 'gray',
    premium: 'purple',
    luxury: 'gold',
  };
  return colors[bucket] || 'gray';
}

/**
 * Obtiene el nombre de la moneda
 */
export function getCurrencyName(currency: CurrencyCode): string {
  const names: Record<CurrencyCode, string> = {
    USD: 'Dólar',
    ARS: 'Peso Argentino',
    COP: 'Peso Colombiano',
    MXN: 'Peso Mexicano',
  };
  return names[currency] || currency;
}

/**
 * Obtiene el símbolo de la moneda
 */
export function getCurrencySymbol(currency: CurrencyCode): string {
  const symbols: Record<CurrencyCode, string> = {
    USD: '$',
    ARS: '$',
    COP: '$',
    MXN: '$',
  };
  return symbols[currency] || currency;
}

/**
 * Convierte FgoParametersDb (de DB) a FgoParameters (para componentes)
 */
export function mapFgoParameters(db: FgoParametersDb): FgoParameters {
  return {
    id: db.id,
    countryCode: db.country_code,
    bucket: db.bucket as BucketType,
    alpha: db.alpha,
    alphaMin: db.alpha_min,
    alphaMax: db.alpha_max,
    rcFloor: db.rc_floor,
    rcHardFloor: db.rc_hard_floor,
    rcSoftCeiling: db.rc_soft_ceiling,
    lossRatioTarget: db.loss_ratio_target,
    monthlyPayoutCap: db.monthly_payout_cap,
    perUserLimit: db.per_user_limit,
    eventCapUsd: db.event_cap_usd,
    updatedAt: new Date(db.updated_at),
  };
}

/**
 * Convierte BookingRiskSnapshotDb a BookingRiskSnapshot
 */
export function mapBookingRiskSnapshot(db: BookingRiskSnapshotDb): BookingRiskSnapshot {
  return {
    bookingId: db.booking_id,
    countryCode: db.country_code,
    bucket: db.bucket as BucketType,
    fxSnapshot: db.fx_snapshot,
    currency: db.currency as CurrencyCode,
    estimatedHoldAmount: db.estimated_hold_amount,
    estimatedDeposit: db.estimated_deposit,
    franchiseUsd: db.franchise_usd,
    hasCard: db.has_card,
    hasWalletSecurity: db.has_wallet_security,
    meta: db.meta,
    createdAt: new Date(db.created_at),
  };
}

/**
 * Convierte BookingInspectionDb a BookingInspection
 */
export function mapBookingInspection(db: BookingInspectionDb): BookingInspection {
  return {
    id: db.id,
    bookingId: db.booking_id,
    stage: db.stage as InspectionStage,
    inspectorId: db.inspector_id,
    photos: db.photos,
    odometer: db.odometer,
    fuelLevel: db.fuel_level,
    latitude: db.latitude,
    longitude: db.longitude,
    signedAt: db.signed_at ? new Date(db.signed_at) : undefined,
    createdAt: new Date(db.created_at),
  };
}

/**
 * Valida que una inspección esté completa
 */
export function isInspectionComplete(inspection: BookingInspection): boolean {
  return (
    inspection.photos.length >= 8 && // Mínimo 8 fotos
    inspection.odometer !== undefined &&
    inspection.fuelLevel !== undefined &&
    inspection.signedAt !== undefined
  );
}

/**
 * Calcula el total del waterfall
 */
export function calculateWaterfallTotal(breakdown: WaterfallBreakdown): number {
  return (
    breakdown.holdCaptured + breakdown.walletDebited + breakdown.extraCharged + breakdown.fgoPaid
  );
}

/**
 * Formatea breakdown del waterfall como string legible
 */
export function formatWaterfallBreakdown(breakdown: WaterfallBreakdown): string {
  const parts: string[] = [];

  if (breakdown.holdCaptured > 0) {
    parts.push(`Hold: ${centsToUsd(breakdown.holdCaptured)} USD`);
  }
  if (breakdown.walletDebited > 0) {
    parts.push(`Wallet: ${centsToUsd(breakdown.walletDebited)} USD`);
  }
  if (breakdown.extraCharged > 0) {
    parts.push(`Extra: ${centsToUsd(breakdown.extraCharged)} USD`);
  }
  if (breakdown.fgoPaid > 0) {
    parts.push(`FGO: ${centsToUsd(breakdown.fgoPaid)} USD`);
  }
  if (breakdown.remainingUncovered > 0) {
    parts.push(`Sin cubrir: ${centsToUsd(breakdown.remainingUncovered)} USD`);
  }

  return parts.join(' + ');
}
