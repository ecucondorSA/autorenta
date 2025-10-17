// Import database types
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

// Re-export for backward compatibility
export type Role = UserRole;

// Nuevos tipos para perfil expandido
export type KycStatus = 'not_started' | 'pending' | 'verified' | 'rejected';
export type OnboardingStatus = 'incomplete' | 'complete';
export type DocumentKind = 'gov_id_front' | 'gov_id_back' | 'driver_license' | 'utility_bill' | 'selfie';

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
}

export interface ProfileAudit {
  id: string;
  user_id: string;
  changed_by: string;
  changes: Record<string, unknown>;
  created_at: string;
}

export interface Car {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  brand: string;
  brand_id?: string;
  model: string;
  model_id?: string;
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
  min_rental_days?: number;
  max_rental_days?: number;
  terms_and_conditions?: string;
  delivery_options?: string[];

  mileage: number;
  cancel_policy: CancelPolicy;
  photos?: CarPhoto[];
  car_photos?: CarPhoto[];
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
  total_cents: number;
  currency: string;
  lines?: Array<{ label: string; amount_cents: number }>;
}

export interface Booking {
  id: string;
  car_id: string;
  renter_id: string;
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

  // Cancellation management
  cancellation_policy_id?: number;
  cancellation_fee_cents?: number;
  cancelled_at?: string;
  cancellation_reason?: string;

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
