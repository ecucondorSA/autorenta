/**
 * Modelos para el sistema de Precios Dinámicos
 * AutoRenta - Dynamic Pricing System
 */

// ============================================================================
// TIPOS BASE
// ============================================================================

export type PricingStrategy = 'fixed' | 'dynamic';

export type SurgeTier = 'none' | 'low' | 'medium' | 'high' | 'extreme';

// ============================================================================
// PRICE LOCK (Bloqueo de Precio)
// ============================================================================

/**
 * Bloqueo temporal de precio (15 minutos)
 * Se genera cuando el usuario inicia el checkout
 */
export interface PriceLock {
  // Identificación
  lockToken: string; // UUID único del lock
  carId: string;
  userId: string;

  // Fechas de la reserva
  rentalStart: Date;
  rentalHours: number;

  // Precio bloqueado
  pricePerHour: number;
  totalPrice: number;
  currency: string;

  // Validez del lock
  lockedUntil: Date;
  createdAt: Date;
  isExpired: boolean;

  // Snapshot completo del cálculo
  priceSnapshot: DynamicPriceSnapshot;
}

/**
 * Resultado de bloquear un precio
 */
export interface LockPriceResult {
  ok: boolean;
  priceLock?: PriceLock;
  error?: string;
  errorCode?: PriceLockErrorCode;
}

/**
 * Códigos de error al bloquear precio
 */
export enum PriceLockErrorCode {
  CAR_NOT_FOUND = 'car_not_found',
  CAR_DELETED = 'car_deleted',
  REGION_NOT_FOUND = 'region_not_found',
  CALCULATION_FAILED = 'calculation_failed',
  NETWORK_ERROR = 'network_error',
}

// ============================================================================
// DYNAMIC PRICE SNAPSHOT (Snapshot del Cálculo)
// ============================================================================

/**
 * Snapshot completo del cálculo de precio dinámico
 * Se guarda en booking.dynamic_price_snapshot (JSONB)
 */
export interface DynamicPriceSnapshot {
  // Resultado final
  pricePerHour: number;
  totalPrice: number;
  currency: string;

  // Desglose de factores
  breakdown: PriceBreakdown;

  // Detalles del contexto
  details: PriceCalculationDetails;

  // Metadata
  uses_dynamic_pricing: boolean;
  locked_until: string; // ISO string
  lock_token: string;
  car_id: string;
  user_id: string;
  rental_start: string; // ISO string
  rental_hours: number;
  created_at: string; // ISO string

  // Surge pricing info
  surgeActive: boolean;
  surgeMessage?: string;
  surgeTier?: SurgeTier;
}

/**
 * Desglose de los factores de precio
 */
export interface PriceBreakdown {
  // Precio base por hora de la región
  basePrice: number;

  // Factores individuales (porcentajes)
  dayFactor: number; // -0.15 a +0.25 (ej: +10% sábado)
  hourFactor: number; // -0.15 a +0.20 (ej: +20% hora pico)
  userFactor: number; // -0.15 a +0.05 (ej: -10% usuario verificado)
  demandFactor: number; // -0.10 a +0.25 (ej: +25% alta demanda)
  eventFactor: number; // 0 a +0.30 (ej: +30% Carnaval)

  // Multiplicador total (suma de todos los factores + 1)
  totalMultiplier: number; // Ej: 1.35 = precio base * 1.35
}

/**
 * Detalles del contexto de cálculo
 */
export interface PriceCalculationDetails {
  // Información del usuario
  userRentals: number; // Cantidad de reservas completadas

  // Información temporal
  dayOfWeek: number; // 0=domingo, 6=sábado
  hourOfDay: number; // 0-23

  // Información de demanda
  availableCars?: number;
  activeBookings?: number;
  pendingRequests?: number;
  demandRatio?: number;

  // Región
  regionId: string;
  regionName?: string;
}

// ============================================================================
// PRICE COMPARISON (Comparación de Precios)
// ============================================================================

/**
 * Comparación entre precio fijo y dinámico
 * Para mostrar al usuario el ahorro/sobrecosto
 */
export interface PriceComparison {
  fixedPrice: number;
  dynamicPrice: number;
  difference: number; // negativo = ahorro, positivo = sobrecosto
  percentageDiff: number; // ej: -15.5 (15.5% más barato)
  isCheaper: boolean;
  isMoreExpensive: boolean;
}

// ============================================================================
// SURGE PRICING INFO (Información de Surge)
// ============================================================================

/**
 * Información de surge pricing para mostrar al usuario
 */
export interface SurgePricingInfo {
  isActive: boolean;
  tier: SurgeTier;
  factor: number; // ej: 0.25 = +25%
  message: string; // ej: "⚡ Alta demanda (+25%)"
  icon: string; // emoji o icon name
  badgeColor: 'red' | 'orange' | 'yellow' | 'green' | 'gray';
}

// ============================================================================
// RPC RESPONSE TYPES (Respuestas de las funciones RPC)
// ============================================================================

/**
 * Respuesta de lock_price_for_booking RPC
 */
export interface LockPriceRpcResponse {
  uses_dynamic_pricing: boolean;

  // Si fixed pricing
  fixed_price?: number;
  message?: string;

  // Si dynamic pricing
  price?: {
    price_per_hour: number;
    total_price: number;
    currency: string;
    breakdown: PriceBreakdown;
    details: PriceCalculationDetails;
  };

  // Lock info
  locked_until?: string; // ISO string
  lock_token?: string;
  car_id?: string;
  user_id?: string;
  rental_start?: string; // ISO string
  rental_hours?: number;
  created_at?: string; // ISO string

  // Error fallback
  error?: string;
  fallback?: boolean;

  // Surge info (si está activo)
  surge_active?: boolean;
  surge_message?: string;
}

/**
 * Parámetros para llamar a lock_price_for_booking RPC
 */
export interface LockPriceRpcParams {
  p_car_id: string;
  p_user_id: string;
  p_rental_start: string; // ISO string
  p_rental_hours: number;
}

/**
 * Parámetros para llamar a request_booking con dynamic pricing
 */
export interface RequestBookingWithDynamicPricingParams {
  p_car_id: string;
  p_start: string; // ISO string
  p_end: string; // ISO string

  // Location (optional)
  p_pickup_lat?: number;
  p_pickup_lng?: number;
  p_dropoff_lat?: number;
  p_dropoff_lng?: number;
  p_delivery_required?: boolean;

  // Dynamic pricing
  p_use_dynamic_pricing: boolean;
  p_price_lock_token?: string;
  p_dynamic_price_snapshot?: DynamicPriceSnapshot;
}

// ============================================================================
// UI STATE
// ============================================================================

/**
 * Estado de UI para el selector de precio dinámico
 */
export interface DynamicPricingUiState {
  // Estrategia seleccionada
  strategy: PricingStrategy;

  // Precio fijo (del auto)
  fixedPrice: number;

  // Precio dinámico (calculado)
  dynamicPrice: number | null;
  priceLock: PriceLock | null;

  // Comparación
  comparison: PriceComparison | null;

  // Surge info
  surgeInfo: SurgePricingInfo | null;

  // Loading states
  isLoadingDynamicPrice: boolean;
  isLockingPrice: boolean;

  // Errors
  error: string | null;

  // Countdown
  lockExpiresIn: number | null; // segundos restantes
  showExpiredWarning: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convierte respuesta RPC a PriceLock
 */
export function rpcResponseToPriceLock(response: LockPriceRpcResponse): PriceLock | null {
  if (!response.uses_dynamic_pricing || !response.price || !response.lock_token) {
    return null;
  }

  return {
    lockToken: response.lock_token,
    carId: response.car_id!,
    userId: response.user_id!,
    rentalStart: new Date(response.rental_start!),
    rentalHours: response.rental_hours!,
    pricePerHour: response.price.price_per_hour,
    totalPrice: response.price.total_price,
    currency: response.price.currency,
    lockedUntil: new Date(response.locked_until!),
    createdAt: new Date(response.created_at!),
    isExpired: new Date(response.locked_until!) < new Date(),
    priceSnapshot: rpcResponseToSnapshot(response),
  };
}

/**
 * Convierte respuesta RPC a DynamicPriceSnapshot
 */
export function rpcResponseToSnapshot(response: LockPriceRpcResponse): DynamicPriceSnapshot {
  return {
    pricePerHour: response.price!.price_per_hour,
    totalPrice: response.price!.total_price,
    currency: response.price!.currency,
    breakdown: response.price!.breakdown,
    details: response.price!.details,
    uses_dynamic_pricing: true,
    locked_until: response.locked_until!,
    lock_token: response.lock_token!,
    car_id: response.car_id!,
    user_id: response.user_id!,
    rental_start: response.rental_start!,
    rental_hours: response.rental_hours!,
    created_at: response.created_at!,
    surgeActive: response.surge_active ?? false,
    surgeMessage: response.surge_message,
    surgeTier: calculateSurgeTier(response.price!.breakdown.demandFactor),
  };
}

/**
 * Calcula el tier de surge según el demand factor
 */
export function calculateSurgeTier(demandFactor: number): SurgeTier {
  if (demandFactor >= 0.25) return 'extreme';
  if (demandFactor >= 0.15) return 'high';
  if (demandFactor >= 0.05) return 'medium';
  if (demandFactor > 0) return 'low';
  return 'none';
}

/**
 * Genera SurgePricingInfo según el tier
 */
export function generateSurgeInfo(snapshot: DynamicPriceSnapshot): SurgePricingInfo {
  const tier = snapshot.surgeTier || 'none';
  const factor = snapshot.breakdown.demandFactor;

  const configs: Record<SurgeTier, Omit<SurgePricingInfo, 'factor' | 'isActive'>> = {
    none: {
      tier: 'none',
      message: 'Precio normal',
      icon: '✓',
      badgeColor: 'green',
    },
    low: {
      tier: 'low',
      message: `Demanda leve (+${Math.round(factor * 100)}%)`,
      icon: '⚡',
      badgeColor: 'yellow',
    },
    medium: {
      tier: 'medium',
      message: `Demanda moderada (+${Math.round(factor * 100)}%)`,
      icon: '⚡',
      badgeColor: 'orange',
    },
    high: {
      tier: 'high',
      message: `⚡ Alta demanda (+${Math.round(factor * 100)}%)`,
      icon: '⚡⚡',
      badgeColor: 'red',
    },
    extreme: {
      tier: 'extreme',
      message: `🔥 Demanda extrema (+${Math.round(factor * 100)}%)`,
      icon: '🔥',
      badgeColor: 'red',
    },
  };

  return {
    ...configs[tier],
    factor,
    isActive: tier !== 'none',
  };
}

/**
 * Calcula comparación entre precio fijo y dinámico
 */
export function calculatePriceComparison(
  fixedPrice: number,
  dynamicPrice: number,
): PriceComparison {
  const difference = dynamicPrice - fixedPrice;
  const percentageDiff = (difference / fixedPrice) * 100;

  return {
    fixedPrice,
    dynamicPrice,
    difference,
    percentageDiff,
    isCheaper: difference < 0,
    isMoreExpensive: difference > 0,
  };
}

/**
 * Verifica si un PriceLock está expirado
 */
export function isPriceLockExpired(priceLock: PriceLock): boolean {
  return priceLock.isExpired || new Date() > priceLock.lockedUntil;
}

/**
 * Calcula segundos restantes hasta expiración del lock
 */
export function calculateLockExpiresIn(priceLock: PriceLock): number {
  const now = new Date().getTime();
  const expiresAt = priceLock.lockedUntil.getTime();
  const diffMs = expiresAt - now;

  return Math.max(0, Math.floor(diffMs / 1000));
}

/**
 * Formatea el countdown del lock (MM:SS)
 */
export function formatLockCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Genera mensaje de ahorro/sobrecosto para mostrar al usuario
 */
export function generatePriceComparisonMessage(comparison: PriceComparison): string {
  const absPercentage = Math.abs(comparison.percentageDiff).toFixed(1);

  if (comparison.isCheaper) {
    return `💰 Ahorrás ${absPercentage}% con precio dinámico`;
  } else if (comparison.isMoreExpensive) {
    return `⚠️ ${absPercentage}% más caro que precio fijo`;
  } else {
    return 'Mismo precio que tarifa fija';
  }
}

/**
 * Genera color del badge según el ahorro/sobrecosto
 */
export function getPriceComparisonBadgeColor(
  comparison: PriceComparison,
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (comparison.isCheaper) return 'success';
  if (comparison.percentageDiff > 10) return 'danger';
  if (comparison.percentageDiff > 0) return 'warning';
  return 'neutral';
}

/**
 * Valida que un price lock sea válido para crear booking
 */
export function validatePriceLock(priceLock: PriceLock | null): string | null {
  if (!priceLock) {
    return 'No hay precio bloqueado. Por favor, vuelve a calcular el precio.';
  }

  if (isPriceLockExpired(priceLock)) {
    return 'El precio bloqueado ha expirado. Por favor, actualiza el precio.';
  }

  return null; // válido
}
