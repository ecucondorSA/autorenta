import type {
  UserRole,
  CarStatus,
  FuelType,
  Transmission,
  CancelPolicy,
  BookingStatus,
  PaymentStatus,
  PaymentProvider,
} from '../types/database.types';

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

// Re-export for backward compatibility
export type Role = UserRole;
export type {
  CarStatus,
  FuelType,
  Transmission,
  CancelPolicy,
  BookingStatus,
  PaymentStatus,
  PaymentProvider,
};

// Export FGO models
export * from './fgo.model';

// Export Insurance models
export * from './insurance.model';

// Nuevos tipos para perfil expandido
export type KycStatus = 'not_started' | 'pending' | 'verified' | 'rejected';
export type OnboardingStatus = 'incomplete' | 'complete';
export type DocumentKind =
  | 'gov_id_front'
  | 'gov_id_back'
  | 'driver_license'
  | 'vehicle_registration'
  | 'vehicle_insurance'
  | 'utility_bill'
  | 'selfie';

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
  kyc: KycStatus;
  onboarding: OnboardingStatus;

  // Términos y marketing
  tos_accepted_at?: string | null;
  marketing_opt_in: boolean;

  // Notificaciones
  notif_prefs: NotificationPrefs;

  // Métricas
  rating_avg: number;
  rating_count: number;

  // Verificaciones
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_driver_verified: boolean;
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

export interface CarOwner {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
}

export interface CarBrand {
  id: string;
  name: string;
  logo_url?: string | null;
  country?: string | null;
  created_at: string;
}

export interface CarModel {
  id: string;
  brand_id: string;
  name: string;
  category?: string | null;
  seats: number;
  doors: number;
  created_at: string;
}

export type VehicleDocumentKind =
  | 'registration' // Cédula verde/título de propiedad
  | 'insurance' // Póliza de seguro
  | 'technical_inspection' // Revisión técnica
  | 'circulation_permit' // Permiso de circulación
  | 'ownership_proof'; // Comprobante de titularidad

export interface VehicleDocument {
  id: string;
  car_id: string;
  kind: VehicleDocumentKind;
  storage_path: string;
  url?: string;
  status: 'pending' | 'verified' | 'rejected';
  expiry_date?: string | null;
  notes?: string | null;
  created_at: string;
  verified_by?: string | null;
  verified_at?: string | null;
}

export interface Car {
  id: string;
  owner_id: string;
  title: string;
  description: string;

  // Foreign Keys to normalized tables
  brand_id: string;
  model_id: string;
  region_id?: string | null; // For dynamic pricing

  // Backward compatibility fields (required in database)
  brand_text_backup: string;
  model_text_backup: string;

  // Additional backward compatibility (populated via JOIN in views)
  brand?: string;
  model?: string;
  brand_name?: string; // From JOIN
  model_name?: string; // From JOIN

  year: number;
  plate?: string | null;
  vin?: string | null;
  transmission: Transmission;
  fuel: FuelType;
  fuel_type: FuelType; // Alias for fuel
  seats: number;
  doors: number;
  color: string;
  features: Record<string, boolean>; // {ac: true, abs: true, airbag: true}
  status: CarStatus;
  price_per_day: number;
  currency: string;
  value_usd?: number; // ✅ NUEVO: Valor real del vehículo en USD (para cálculos de riesgo/seguro)
  rating_avg: number;
  rating_count: number;

  // Location fields
  location_city: string;
  location_state: string;
  location_province: string;
  location_country: string;
  location_lat?: number | null;
  location_lng?: number | null;

  // Address fields (new)
  location_street?: string | null;
  location_street_number?: string | null;
  location_neighborhood?: string | null;
  location_postal_code?: string | null;
  location_formatted_address?: string | null;

  // Rental terms (new)
  payment_methods?: string[];
  deposit_required?: boolean;
  deposit_amount?: number;
  insurance_included?: boolean;
  auto_approval?: boolean; // ✅ NUEVO: Auto-aprobación de reservas
  min_rental_days?: number;
  max_rental_days?: number;
  terms_and_conditions?: string;
  delivery_options?: string[];

  mileage: number;
  cancel_policy: CancelPolicy;
  photos?: CarPhoto[];
  car_photos?: CarPhoto[];
  images?: string[]; // Simple array of image URLs (for backward compatibility)
  owner?: CarOwner; // Owner profile information
  created_at: string;
  updated_at: string;
}

export interface CarPhoto {
  id: string;
  car_id: string;
  url: string;
  stored_path: string;
  position: number;
  sort_order: number;
  created_at: string;
}

export interface CarFilters {
  city?: string;
  from?: string;
  to?: string;
  blockedCarIds?: string[];
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
 * Estado del depósito de garantía en el sistema dual
 */
export type BookingDepositStatus = 'none' | 'locked' | 'released' | 'charged';

/**
 * Estado del proceso de confirmación bilateral
 */
export type BookingCompletionStatus =
  | 'active' // Booking activo, alquiler en progreso
  | 'returned' // Auto devuelto, esperando confirmaciones
  | 'pending_owner' // Esperando confirmación del propietario
  | 'pending_renter' // Esperando confirmación del locatario
  | 'pending_both' // Esperando confirmación de ambas partes
  | 'funds_released'; // Fondos liberados exitosamente

export interface Booking {
  id: string;
  car_id: string;
  user_id: string; // Alias for renter_id (backward compatibility)
  renter_id: string;
  owner_id?: string; // Car owner ID
  start_at: string;
  end_at: string;
  status: BookingStatus;
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

  // Dual payment system (rental + deposit)
  rental_amount_cents?: number | null;
  deposit_amount_cents?: number | null;
  rental_lock_transaction_id?: string | null;
  deposit_lock_transaction_id?: string | null;
  rental_payment_transaction_id?: string | null;
  deposit_release_transaction_id?: string | null;
  deposit_status?: BookingDepositStatus | null;

  // Bilateral confirmation system
  returned_at?: string | null;
  owner_confirmed_delivery?: boolean | null;
  owner_confirmation_at?: string | null;
  owner_reported_damages?: boolean | null;
  owner_damage_amount?: number | null;
  owner_damage_description?: string | null;
  renter_confirmed_payment?: boolean | null;
  renter_confirmation_at?: string | null;
  funds_released_at?: string | null;
  completion_status?: BookingCompletionStatus | null;

  // Cancellation management
  cancellation_policy_id?: number;
  cancellation_fee_cents?: number;
  cancelled_at?: string;
  cancellation_reason?: string;

  // ✅ DISTANCE-BASED PRICING: Campos de ubicación y distancia
  pickup_location_lat?: number | null;
  pickup_location_lng?: number | null;
  dropoff_location_lat?: number | null;
  dropoff_location_lng?: number | null;
  delivery_required?: boolean | null;
  delivery_distance_km?: number | null;
  delivery_fee_cents?: number | null;
  distance_risk_tier?: 'local' | 'regional' | 'long_distance' | null;

  // Extended fields from views (my_bookings, owner_bookings)
  car_title?: string;
  car_brand?: string;
  car_model?: string;
  car_year?: number;
  car_city?: string;
  car_province?: string;
  main_photo_url?: string;
  payment_status?: PaymentStatus;
  payment_provider?: PaymentProvider;

  // Owner bookings view fields
  renter_name?: string;
  renter_avatar?: string;

  // ✅ INSURANCE SYSTEM: Campos de seguro P2P
  insurance_coverage_id?: string | null;
  insurance_premium_total?: number | null; // Total prima de seguro en centavos
  security_deposit_amount?: number | null; // Monto de depósito/franquicia en centavos
  deposit_held?: boolean | null; // Si el depósito está retenido
  deposit_released_at?: string | null; // Cuándo se liberó el depósito
  has_active_claim?: boolean | null; // Si tiene un siniestro activo

  // Relación con cobertura (populated via JOIN)
  insurance_coverage?: Record<string, unknown>; // BookingInsuranceCoverage

  // Relación con car (populated dinamically in some queries)
  car?: Partial<Car>;
}

export interface PaymentIntent {
  id: string;
  booking_id: string;
  provider: string;
  status: string;
  created_at: string;
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

  // Category ratings (1-5)
  rating_cleanliness: number;
  rating_communication: number;
  rating_accuracy: number;
  rating_location: number;
  rating_checkin: number;
  rating_value: number;

  // Overall rating (calculated)
  rating_overall?: number;

  // Comments
  comment_public?: string | null;
  comment_private?: string | null;

  // Status
  status: ReviewStatus;
  is_visible: boolean;
  published_at?: string | null;

  // Moderation
  is_flagged: boolean;
  flag_reason?: string | null;
  flagged_by?: string | null;
  flagged_at?: string | null;
  moderation_status: ModerationStatus;
  moderated_by?: string | null;
  moderated_at?: string | null;
  moderation_notes?: string | null;

  // Timestamps
  created_at: string;

  // Extended fields (from joins)
  reviewer_name?: string;
  reviewer_avatar?: string;
  reviewee_name?: string;
  car_title?: string;
}

export interface CreateReviewParams {
  booking_id: string;
  reviewee_id: string;
  car_id: string;
  review_type: ReviewType;
  rating_cleanliness: number;
  rating_communication: number;
  rating_accuracy: number;
  rating_location: number;
  rating_checkin: number;
  rating_value: number;
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

export interface CarStats {
  car_id: string;
  reviews_count: number;
  rating_avg: number;
  rating_cleanliness_avg: number;
  rating_communication_avg: number;
  rating_accuracy_avg: number;
  rating_location_avg: number;
  rating_checkin_avg: number;
  rating_value_avg: number;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  cancellation_rate: number;
  last_review_at?: string | null;
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

export interface BankAccount {
  id: string;
  user_id: string;
  account_type: AccountType;
  account_number: string;
  account_holder_name: string;
  // DEPRECATED: Use gov_id_number from UserProfile instead
  account_holder_document?: string;
  bank_name?: string | null;
  is_verified: boolean;
  verified_at?: string | null;
  verification_method?: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type WithdrawalStatus =
  | 'pending'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'cancelled';

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  bank_account_id: string;
  amount: number;
  currency: string;
  fee_amount: number;
  net_amount: number;
  status: WithdrawalStatus;
  provider: string;
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

  // Extended fields from views/joins
  user_name?: string;
  user_email?: string;
  bank_account?: BankAccount;
}

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
