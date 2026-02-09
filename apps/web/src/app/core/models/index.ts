import type { Car } from './car.model';
import type { BookingDepositStatus } from './wallet.model';

// ============================================================================
// Locally defined enum types
// database.types.ts is auto-generated but doesn't export enum types properly
// These match the database enums and are defined here for TypeScript
// ============================================================================
export type PaymentProvider = 'mercadopago' | 'stripe' | 'paypal' | 'wallet' | 'manual';
// Must match DB enum: public.payment_status (pending, processing, approved, rejected, refunded, cancelled)
export type PaymentStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'refunded' | 'cancelled';
export type Transmission = 'manual' | 'automatic';
export type UserRole = 'renter' | 'owner' | 'both';
export type FuelType = 'gasoline' | 'diesel' | 'electric' | 'electrico' | 'hybrid' | 'gnc' | 'flex';
export type CancelPolicy = 'flexible' | 'moderate' | 'strict';
// Must match DB enum: public.car_status (draft, active, paused, deleted, pending)
export type CarStatus = 'draft' | 'active' | 'paused' | 'deleted' | 'pending';
// Must match DB enum: public.booking_status
export type BookingStatus =
  | 'pending'
  | 'pending_payment'
  | 'pending_approval'
  | 'confirmed'
  | 'in_progress'
  | 'pending_return'
  | 'returned'
  | 'inspected_good'
  | 'damage_reported'
  | 'completed'
  | 'cancelled'
  | 'cancelled_renter'
  | 'cancelled_owner'
  | 'payment_validation_failed'
  | 'dispute'
  | 'disputed';

// UI-only derived statuses (NOT stored in DB `booking_status`)
export type BookingUiStatus =
  | BookingStatus
  | 'pending_owner_approval' // legacy UI alias (use `pending_approval` in DB)
  | 'pending_dispute_resolution' // legacy UI alias (maps to `disputed` in DB)
  | 'pending_deposit'
  | 'pending_review'
  | 'resolved'
  | 'cancelled_system'
  | 'rejected'
  | 'no_show'
  | 'expired';
export type DocumentKind =
  | 'gov_id_front'
  | 'gov_id_back'
  | 'driver_license'
  | 'license_front'
  | 'license_back'
  | 'vehicle_registration'
  | 'vehicle_insurance'
  | 'utility_bill'
  | 'selfie'
  | 'criminal_record';
export type KycStatus = 'not_started' | 'pending' | 'verified' | 'rejected';

// Admin types
export type { AdminAuditLog, AdminRole } from '../types/admin.types';

// Re-export Supabase types for use throughout the app
export type {
  BankAccountDB,
  BookingDB,
  CarDB,
  PaymentDB,
  ProfileDB,
  ReviewDB,
  WalletTransactionDB,
} from '../types/supabase-types';

// Wallet domain models (preferred over DB row types)
export type {
  AddBankAccountParams,
  ApproveWithdrawalParams,
  BankAccount,
  BankAccountType,
  BookingDepositStatus,
  ExpiringCredit,
  InitiateDepositParams,
  RejectWithdrawalParams,
  RequestWithdrawalParams,
  WalletApproveWithdrawalResponse,
  WalletBalance,
  WalletCompleteWithdrawalResponse,
  WalletError,
  WalletHistoryEntry,
  WalletInitiateDepositResponse,
  WalletLoadingState,
  WalletLockFundsResponse,
  WalletLockRentalAndDepositResponse,
  WalletRequestWithdrawalResponse,
  WalletTransactionFilters,
  WalletUnlockFundsResponse,
  WithdrawalFilters,
  WithdrawalLoadingState,
  WithdrawalRequest,
  WithdrawalStatus,
} from './wallet.model';

// Feature flag models
export * from './feature-flag.model';

// Booking detail payment models (selective export to avoid conflicts)
export {
  applyUpgradeToDeductible,
  calculateCreditSecurityUsd,
  calculateDeductibleUsd,
  calculateHoldEstimatedArs,
  isFxExpired,
  ValidationErrorCodes,
} from './booking-detail-payment.model';
export type {
  AuthorizePaymentResult,
  BookingDates,
  BookingDetailPaymentState,
  BookingDetailRiskSnapshotDb,
  BookingInput,
  BookingPriceBreakdown,
  BookingVoucher,
  CalculatePricingParams,
  CalculateRiskSnapshotParams,
  CountryCode,
  CoverageUpgrade,
  CreateBookingParams,
  CreateBookingResult,
  FxSnapshot,
  FxSnapshotDb,
  PaymentAuthorization,
  PaymentMode,
  RiskSnapshot,
  UserConsents,
  ValidationError,
  WalletLock,
  WalletLockResult,
} from './booking-detail-payment.model';

// Tripo AI models
export type { TripoTaskRequest, TripoTaskResponse, TripoTaskStatusResponse } from './tripo.models';

// Re-export for backward compatibility
export type Role = UserRole;

// Export FGO models
export * from './fgo-v1-1.model';
export * from './fgo.model';

// Export Guarantee Tiers models (6-tier vehicle system)
export * from './guarantee-tiers.model';

// Export Reward Pool models (Senior Implementation)
export * from './reward-pool.model';

// Export Insurance models
export * from './insurance.model';

// Export Car models
export * from './car.model';

// Export Dashboard models
export * from './dashboard.model';

// Export Organization models
export * from './organization.model';

// Export Dynamic Pricing models
export * from './dynamic-pricing.model';

// Export Marketplace models
export * from './marketplace.model';

// Export Traffic infractions models
export * from './traffic-infraction.model';

// Export Gemini AI models
export * from './gemini.model';

// Export ProfileService types
export type { UpdateProfileData } from '../services/auth/profile.service';

// Export Participation models
export * from './participation.model';

// Nuevos tipos para perfil expandido
type OnboardingStatus = 'incomplete' | 'complete';

export interface NotificationChannelPrefs {
  bookings: boolean;
  promotions: boolean;
}

export interface NotificationPrefs {
  email: NotificationChannelPrefs;
  push: NotificationChannelPrefs;
  whatsapp: NotificationChannelPrefs;
}

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  role: Role;

  // Wallet
  wallet_account_number?: string | null;

  // Información de contacto
  phone?: string | null;
  whatsapp?: string | null;

  // Documentos de identidad
  gov_id_type?: string | null;
  gov_id_number?: string | null;
  driver_license_number?: string | null;
  driver_license_country?: string | null;
  driver_license_expiry?: string | null;
  driver_license_class?: string | null;
  driver_license_professional?: boolean | null;
  driver_license_points?: number | null;

  // Fecha de nacimiento (para cálculo de edad en seguros)
  date_of_birth?: string | null; // ISO date string YYYY-MM-DD

  // Dirección
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;

  // Ubicación GPS (para pricing por distancia)
  home_latitude?: number | null;
  home_longitude?: number | null;
  location_verified_at?: string | null;
  preferred_search_radius_km?: number | null;

  // Preferencias
  timezone: string;
  locale: string;
  currency: string;
  default_currency?: string; // Backward compatibility

  // Estados
  onboarding: OnboardingStatus;

  // Términos y marketing
  tos_accepted_at?: string | null;
  marketing_opt_in: boolean;

  // Notificaciones
  notif_prefs: NotificationPrefs;

  // Métricas
  rating_avg: number;
  rating_count: number;

  // Verificaciones (campos de BD: email_verified, phone_verified, id_verified)
  email_verified: boolean;
  phone_verified: boolean;
  id_verified: boolean;
  is_admin?: boolean;

  // Permisos derivados (de la vista me_profile)
  can_publish_cars?: boolean;
  can_book_cars?: boolean;

  // MercadoPago OAuth fields
  mercadopago_collector_id?: string | null;
  mercadopago_connected?: boolean;
  mercadopago_connected_at?: string | null;
  mercadopago_access_token?: string | null;
  mercadopago_refresh_token?: string | null;
  mercadopago_access_token_expires_at?: string | null;
  mercadopago_public_key?: string | null;
  mercadopago_account_type?: string | null;
  mercadopago_country?: string | null;
  mercadopago_site_id?: string | null;
  mercadopago_oauth_state?: string | null;

  // Timestamps
  created_at: string;
  updated_at?: string;
}

export interface UserDocument {
  id: string;
  user_id: string;
  kind: DocumentKind;
  storage_path: string;
  status: KycStatus;
  notes?: string | null;
  created_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  analyzed_at?: string | null;
}

export type VerificationRole = 'driver' | 'owner';
export type VerificationStatus = 'VERIFICADO' | 'PENDIENTE' | 'RECHAZADO';

export interface UserVerificationStatus {
  user_id: string;
  role: VerificationRole;
  status: VerificationStatus;
  missing_docs: string[];
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at: string;
}

export interface ProfileAudit {
  id: string;
  user_id: string;
  changed_by: string;
  changes: Record<string, unknown>;
  created_at: string;
}

export interface BookingBreakdown {
  days: number;
  nightly_rate_cents: number;
  subtotal_cents: number;
  insurance_cents?: number;
  fees_cents?: number;
  discounts_cents?: number;
  deposit_cents?: number; // Depósito de garantía (se devuelve al finalizar)
  total_cents: number;
  currency: string;
  lines?: Array<{ label: string; amount_cents: number }>;
}

/**
 * Estado del proceso de confirmación bilateral
 */
export type BookingCompletionStatus =
  | 'active' // Booking activo, alquiler en progreso
  | 'returned' // Auto devuelto, esperando confirmaciones
  | 'pending_owner' // Esperando confirmación del propietario
  | 'pending_renter' // Esperando confirmación del locatario
  | 'pending_both' // Esperando confirmación de ambas partes
  | 'funds_released' // Fondos liberados exitosamente
  | 'inspected_good' // Inspeccionado sin daños
  | 'damage_reported' // Con daños reportados
  | 'disputed'; // En disputa activa

export interface Booking {
  id: string;
  car_id: string;
  user_id: string; // Alias for renter_id (backward compatibility)
  renter_id: string;
  owner_id?: string; // Car owner ID
  start_at: string;
  end_at: string;
  status: BookingUiStatus;
  total_amount: number;
  currency: string;
  created_at: string;
  updated_at?: string;

  // Pricing breakdown fields
  days_count?: number;
  nightly_rate_cents?: number;
  subtotal_cents?: number;
  insurance_cents?: number;
  fees_cents?: number;
  discounts_cents?: number;
  total_cents?: number;
  breakdown?: BookingBreakdown;

  // Payment management
  payment_intent_id?: string;
  expires_at?: string;
  paid_at?: string;
  payment_method?: 'credit_card' | 'wallet' | 'partial_wallet' | null;
  payment_mode?: 'card' | 'wallet' | null; // NEW: Payment mode for detail-payment flow
  authorized_payment_id?: string | null; // NEW: For card hold authorization
  wallet_lock_id?: string | null; // NEW: For wallet lock ID
  coverage_upgrade?: 'standard' | 'premium' | 'zero_franchise' | null; // NEW: Coverage upgrade
  risk_snapshot_booking_id?: string | null; // NEW: FK to booking_risk_snapshot
  risk_snapshot_date?: string | null; // NEW: When risk snapshot was created
  wallet_amount_cents?: number | null;
  wallet_lock_transaction_id?: string | null;
  wallet_status?: 'none' | 'locked' | 'charged' | 'refunded' | 'partially_charged' | null;
  wallet_charged_at?: string | null;
  wallet_refunded_at?: string | null;
  mp_security_deposit_order_id?: string | null; // NUEVO: ID de la pre-autorización de MP para el depósito

  // Campos de pago (alquiler + depósito)
  rental_amount_cents?: number | null;
  deposit_amount_cents?: number | null;
  rental_lock_transaction_id?: string | null;
  deposit_lock_transaction_id?: string | null;
  rental_payment_transaction_id?: string | null;
  deposit_release_transaction_id?: string | null;
  deposit_status?: BookingDepositStatus | null;

  // NUEVO: Fecha de expiración del lock de garantía
  // @P0-004 FIX: Se libera automáticamente el depósito si no hay acción
  // El backend debe actualizar este campo al bloquear el depósito
  deposit_lock_expires_at?: string | null;

  // Bilateral confirmation system
  // IMPORTANTE: Estos nombres deben coincidir EXACTAMENTE con las columnas de BD
  returned_at?: string | null;
  owner_confirmed_delivery?: boolean | null;
  owner_confirmed_at?: string | null; // Timestamp confirmación owner (BD: owner_confirmed_at)
  has_damages?: boolean | null; // Si reportó daños (BD: has_damages)
  damage_amount_cents?: number | null; // Monto daños en CENTAVOS (BD: damage_amount_cents)
  damage_description?: string | null; // Descripción daños (BD: damage_description)
  renter_confirmed_payment?: boolean | null;
  renter_confirmed_at?: string | null; // Timestamp confirmación renter (BD: renter_confirmed_at)
  funds_released_at?: string | null;
  completion_status?: BookingCompletionStatus | null;

  // NEW: Dispute management fields
  dispute_open_at?: string | null;
  dispute_reason?: string | null;
  dispute_evidence?: string[] | null;
  dispute_status?: 'open' | 'resolved' | 'rejected' | null; // open, resolved (owner wins), rejected (renter wins)
  dispute_resolved_at?: string | null;

  // NEW: Inspection V2 fields
  inspection_status?: 'pending' | 'good' | 'damaged' | 'disputed' | 'damage_accepted' | null;
  inspection_evidence?: string[] | null;
  inspection_comment?: string | null;
  auto_release_at?: string | null;

  // Cancellation management
  cancellation_policy_id?: number;
  cancellation_fee_cents?: number;
  cancelled_at?: string;
  cancellation_reason?: string;
  cancelled_by_role?: 'renter' | 'owner' | 'system' | 'admin' | null;

  // ✅ DISTANCE-BASED PRICING: Campos de ubicación y distancia
  pickup_location_lat?: number | null;
  pickup_location_lng?: number | null;
  dropoff_location_lat?: number | null;
  dropoff_location_lng?: number | null;
  delivery_required?: boolean | null;
  delivery_distance_km?: number | null;
  delivery_fee_cents?: number | null;
  distance_risk_tier?: 'local' | 'regional' | 'long_distance' | null;

  // Metadata
  metadata?: Record<string, unknown> | null;

  // ✅ DYNAMIC PRICING: Campos de pricing dinámico
  has_dynamic_pricing?: boolean | null;
  dynamic_price_snapshot?: Record<string, unknown> | null; // JSONB stored as object
  price_locked_until?: string | null; // ISO timestamp
  price_lock_token?: string | null; // UUID

  // Extended fields from views (my_bookings, owner_bookings)
  car_title?: string;
  car_brand?: string;
  car_model?: string;
  car_year?: number;
  car_city?: string;
  car_province?: string;
  car_image?: string;
  main_photo_url?: string;
  car_location_lat?: number | null;
  car_location_lng?: number | null;
  payment_status?: PaymentStatus;
  payment_provider?: PaymentProvider;

  // Bookings view fields (populated from joins)
  renter_name?: string;
  renter_avatar?: string;
  owner_name?: string;
  owner_avatar?: string;

  // ✅ INSURANCE SYSTEM: Campos de seguro P2P
  insurance_coverage_id?: string | null;
  insurance_policy_number?: string | null; // Número de póliza de seguro
  insurance_premium_total?: number | null; // Total prima de seguro en centavos
  security_deposit_amount?: number | null; // Monto de depósito/franquicia en centavos
  deposit_held?: boolean | null; // Si el depósito está retenido
  deposit_released_at?: string | null; // Cuándo se liberó el depósito
  has_active_claim?: boolean | null; // Si tiene un siniestro activo

  // Relación con cobertura (populated via JOIN)
  insurance_coverage?: Record<string, unknown>; // BookingInsuranceCoverage

  // Relación con car (populated dinamically in some queries)
  car?: Partial<Car>;

  // ✅ BOOKING EXTENSION: Campos para extensiones de reserva
  extension_status?: 'pending' | 'approved' | 'rejected' | null;
  extension_new_end_date?: string | null;
  extension_additional_cost_cents?: number | null;
  extension_requested_at?: string | null;
  extension_responded_at?: string | null;

  [key: string]: unknown; // Index signature for DatabaseRecord compatibility
}

export interface BookingExtensionRequest {
  id: string;
  booking_id: string;
  renter_id: string;
  owner_id: string;
  original_end_at: string;
  new_end_at: string;
  request_status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  estimated_cost_amount: number | null;
  estimated_cost_currency: string | null;
  renter_message: string | null;
  owner_response: string | null;
  requested_at: string;
  responded_at: string | null;

  // Aliases for booking_extensions table compatibility
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_end_at?: string;
  additional_cost_cents?: number | null;
  additional_amount_cents?: number | null;
  reason?: string | null;
}

export interface PaymentIntent {
  id: string;
  booking_id?: string | null; // booking_id puede ser nulo para depósitos de seguridad
  user_id?: string; // ID del usuario para el intent (por ejemplo, para depósitos de seguridad)
  provider: string; // 'mercadopago' o 'wallet'
  status: string; // 'pending', 'authorized', 'captured', 'cancelled', 'failed', 'completed'
  created_at: string;
  updated_at?: string;
  amount_usd?: number;
  amount_ars?: number;
  fx_rate?: number;
  description?: string;
  intent_type?: 'booking' | 'security_deposit' | 'fine'; // Nuevo: tipo de intent
  is_preauth?: boolean; // Nuevo: si es una pre-autorización
  mp_order_id?: string | null; // Nuevo: ID de la orden de MercadoPago para pre-autorizaciones
  mp_order_status?: string | null; // Nuevo: Estado de la orden de MercadoPago
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  provider_payment_id?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// REVIEWS SYSTEM (Airbnb-style)
// ============================================

export type ReviewType = 'renter_to_owner' | 'owner_to_renter';
export type ReviewStatus = 'pending' | 'published' | 'hidden';
export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  car_id: string;
  review_type: ReviewType;

  // ============================================
  // RENTER → OWNER ratings (evaluating car/owner)
  // ============================================
  rating_cleanliness?: number | null; // Limpieza del vehículo
  rating_accuracy?: number | null; // Descripción vs realidad
  rating_location?: number | null; // Punto de entrega
  rating_checkin?: number | null; // Proceso de entrega
  rating_value?: number | null; // Relación precio-calidad

  // ============================================
  // OWNER → RENTER ratings (evaluating renter)
  // ============================================
  rating_punctuality?: number | null; // Puntualidad
  rating_care?: number | null; // Cuidado del vehículo
  rating_rules?: number | null; // Respeto de reglas
  rating_recommend?: number | null; // ¿Lo recomendarías?

  // ============================================
  // SHARED ratings (both types)
  // ============================================
  rating_communication?: number | null; // Comunicación
  rating?: number | null; // Legacy: rating general

  // Overall rating (calculated)
  rating_overall?: number;

  // Comments
  comment_public?: string | null;
  comment_private?: string | null;
  comment?: string | null; // Legacy field

  // Status
  status: ReviewStatus;
  is_visible: boolean;
  published_at?: string | null;

  // Legacy flags (for backward compatibility)
  is_car_review?: boolean;
  is_renter_review?: boolean;

  // Moderation
  is_flagged: boolean;
  flag_reason?: string | null;
  flagged_by?: string | null;
  flagged_at?: string | null;
  flagged_by_name?: string | null;
  moderation_status: ModerationStatus;
  moderated_by?: string | null;
  moderated_at?: string | null;
  moderation_notes?: string | null;
  moderated_by_name?: string | null;
  flag_status?: 'pending' | 'approved' | 'rejected';

  // Timestamps
  created_at: string;

  // Extended fields (from joins)
  reviewer_name?: string;
  reviewer_avatar?: string;
  reviewee_name?: string;
  car_title?: string;
}

// Base params for all reviews
interface BaseReviewParams {
  booking_id: string;
  reviewee_id: string;
  car_id: string;
  review_type: ReviewType;
  rating_communication: number; // Shared between both types
  comment_public?: string;
  comment_private?: string;
}

// Renter evaluating Owner/Car
export interface RenterToOwnerReviewParams extends BaseReviewParams {
  review_type: 'renter_to_owner';
  rating_cleanliness: number;
  rating_accuracy: number;
  rating_location: number;
  rating_checkin: number;
  rating_value: number;
}

// Owner evaluating Renter
export interface OwnerToRenterReviewParams extends BaseReviewParams {
  review_type: 'owner_to_renter';
  rating_punctuality: number;
  rating_care: number;
  rating_rules: number;
  rating_recommend: number;
}

// Union type for creating reviews
export type CreateReviewParams = RenterToOwnerReviewParams | OwnerToRenterReviewParams;

// Legacy interface for backward compatibility
export interface CreateReviewParamsLegacy {
  booking_id: string;
  reviewee_id: string;
  car_id: string;
  review_type: ReviewType;
  rating_cleanliness?: number;
  rating_communication: number;
  rating_accuracy?: number;
  rating_location?: number;
  rating_checkin?: number;
  rating_value?: number;
  rating_punctuality?: number;
  rating_care?: number;
  rating_rules?: number;
  rating_recommend?: number;
  comment_public?: string;
  comment_private?: string;
}

export interface UserStats {
  user_id: string;

  // Owner stats
  owner_reviews_count: number;
  owner_rating_avg: number;
  owner_rating_cleanliness_avg: number;
  owner_rating_communication_avg: number;
  owner_rating_accuracy_avg: number;
  owner_rating_location_avg: number;
  owner_rating_checkin_avg: number;
  owner_rating_value_avg: number;

  // Renter stats
  renter_reviews_count: number;
  renter_rating_avg: number;
  renter_rating_cleanliness_avg: number;
  renter_rating_communication_avg: number;
  renter_rating_accuracy_avg: number;
  renter_rating_checkin_avg: number;

  // Bookings
  total_bookings_as_owner: number;
  total_bookings_as_renter: number;
  cancellation_count: number;
  cancellation_rate: number;

  // Badges
  is_top_host: boolean;
  is_super_host: boolean;
  is_verified_renter: boolean;
  badges: Badge[];

  // Timestamps
  last_review_received_at?: string | null;
  updated_at: string;
}

export interface Badge {
  type: 'top_host' | 'super_host' | 'verified_renter' | 'trusted_driver';
  label: string;
  description: string;
  earned_at: string;
}

export interface ReviewSummary {
  total_count: number;
  average_rating: number;
  rating_distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  category_averages: {
    cleanliness: number;
    communication: number;
    accuracy: number;
    location: number;
    checkin: number;
    value: number;
  };
}

// ============================================
// CARS COMPARISON SYSTEM
// ============================================

export interface CarComparison {
  carIds: string[];
  timestamp: string;
}

export interface ComparisonRow {
  label: string;
  category: 'basic' | 'specs' | 'pricing' | 'location' | 'owner';
  values: (string | number | boolean | null)[];
  highlightBest?: boolean; // Para resaltar el mejor valor en la comparación
}

// ============================================
// WALLET & WITHDRAWALS SYSTEM
// ============================================

export type AccountType = 'cbu' | 'cvu' | 'alias';

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'payment' | 'refund' | 'lock' | 'unlock';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  provider?: string | null;
  provider_transaction_id?: string | null;
  provider_metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface UserWallet {
  user_id: string;
  available_balance: number;
  locked_balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// BONUS-MALUS SYSTEM
// ============================================

export type BonusMalusType = 'BONUS' | 'MALUS' | 'NEUTRAL';
export type AutorentaTier = 'standard' | 'trusted' | 'elite'; // NUEVO TIER

export interface UserBonusMalus {
  user_id: string;
  total_factor: number; // -0.15 a +0.20 (negativo = bonus/descuento, positivo = malus/recargo)
  tier?: AutorentaTier; // NUEVO: Nivel de confianza
  rating_factor: number;
  cancellation_factor: number;
  completion_factor: number;
  verification_factor: number;
  metrics: BonusMalusMetrics;
  last_calculated_at: string;
  next_recalculation_at: string;
  created_at: string;
  updated_at: string;
}

export interface BonusMalusMetrics {
  average_rating: number;
  owner_rating: number;
  renter_rating: number;
  cancellation_rate: number;
  total_rentals: number;
  completed_rentals: number;
  is_verified: boolean;
  owner_reviews_count: number;
  renter_reviews_count: number;
  factors: {
    rating_factor: number;
    cancellation_factor: number;
    completion_factor: number;
    verification_factor: number;
  };
}

export interface BonusMalusCalculation {
  user_id: string;
  total_factor: number;
  discount_or_surcharge: string;
  percentage: string;
  breakdown: {
    rating_factor: number;
    cancellation_factor: number;
    completion_factor: number;
    verification_factor: number;
  };
  metrics: BonusMalusMetrics;
}

export interface BonusMalusDisplay {
  type: BonusMalusType;
  percentage: number; // Valor absoluto para mostrar
  message: string;
  icon: string;
  color: string;
  tips?: string[]; // Consejos para mejorar el factor
}

// ============================================
// REFUND MANAGEMENT SYSTEM
// ============================================

export type RefundStatus =
  | 'pending'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'rejected';
export type RefundDestination = 'wallet' | 'original_payment_method';

export interface RefundRequest {
  id: string;
  booking_id: string;
  user_id: string;
  refund_amount: number;
  currency: string;
  destination: RefundDestination;
  status: RefundStatus;

  // Admin actions
  approved_by?: string | null;
  approved_at?: string | null;
  processed_by?: string | null;
  processed_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;

  // Reasons and notes
  request_reason?: string | null;
  rejection_reason?: string | null;
  admin_notes?: string | null;

  // Provider tracking
  provider?: string | null;
  provider_refund_id?: string | null;
  provider_metadata?: Record<string, unknown> | null;

  // Wallet transaction
  wallet_transaction_id?: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  failed_at?: string | null;

  // Extended fields (from joins)
  user_name?: string;
  user_email?: string;
  booking_total?: number;
  car_title?: string;
}

export interface ProcessRefundParams {
  booking_id: string;
  refund_amount: number;
  destination: RefundDestination;
  reason?: string;
}

export interface ProcessRefundResult {
  success: boolean;
  refund_request_id: string;
  booking_id: string;
  amount: number;
  destination: RefundDestination;
  status: RefundStatus;
  wallet_transaction_id?: string | null;
  message: string;
}

// Export Subscription models (Autorentar Club)
export * from './subscription.model';

// Export Participation models (Negocio en Participacion)
export * from './participation.model';

// Export Credit Report models (Nosis/Veraz integration)
export * from './credit-report.model';
