import type { CancelPolicy, CarStatus, FuelType, Transmission } from '@core/types/database.types';

export interface CarOwner {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  email_verified: boolean;
  phone_verified: boolean;
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
  organization_id?: string | null; // ✅ Fleet Management

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
  availability_status?: 'available' | 'in_use' | 'soon_available' | 'unavailable';
  price_per_day: number;
  currency: string;
  value_usd?: number; // ✅ NUEVO: Valor real del vehículo en USD (para cálculos de riesgo/seguro)
  security_deposit_usd?: number; // ✅ NUEVO: Depósito de garantía en USD
  uses_dynamic_pricing?: boolean; // ✅ DYNAMIC PRICING: Si el auto usa pricing dinámico
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

  // Rules & Preferences (Owner)
  mileage_limit?: number | null; // 0 = unlimited
  extra_km_price?: number | null;
  fuel_policy?: string | null; // 'full_to_full', etc.
  allow_second_driver?: boolean | null;
  second_driver_cost?: number | null;
  max_anticipation_days?: number | null;

  // Restrictions (behavior & geographic)
  allow_smoking?: boolean;
  allow_pets?: boolean;
  allow_rideshare?: boolean;
  allowed_provinces?: string[];
  max_distance_km?: number | null;

  // Insurance deductible (franquicia)
  insurance_deductible_usd?: number | null;

  mileage: number;
  cancel_policy: CancelPolicy;
  photos?: CarPhoto[];
  car_photos?: CarPhoto[];
  images?: string[]; // Simple array of image URLs (for backward compatibility)
  owner?: CarOwner; // Owner profile information
  created_at: string;
  updated_at: string;
  vehicle_type?: string | null;

  // Legal & Insurance (from views)
  insurance_policy_number?: string | null;
  insurance_company?: string | null;
  insurance_expiration?: string | null;

  // Telemetry & Security (Underwriting Gates)
  has_telemetry?: boolean;
  telemetry_provider?: string | null;
  kill_switch_enabled?: boolean;

  // BYOI Insurance Verification (mandatory for pilot)
  insurance_status?: InsuranceVerificationStatus;
  insurance_document_url?: string | null;
  insurance_verified_at?: string | null;
  insurance_verified_by?: string | null;
  insurance_rejection_reason?: string | null;
  has_owner_insurance?: boolean;
  insurance_coverage_type?: 'personal_endorsed' | 'fleet' | null;
  insurance_expires_at?: string | null;
}

/**
 * Insurance verification status for BYOI policy
 */
export type InsuranceVerificationStatus =
  | 'not_uploaded' // No insurance document uploaded
  | 'pending' // Document uploaded, awaiting admin review
  | 'verified' // Admin verified, insurance is valid
  | 'rejected' // Admin rejected (invalid document/coverage)
  | 'expired'; // Insurance has expired

/**
 * Insurance verification submission
 */
export interface InsuranceVerificationSubmission {
  car_id: string;
  document_url: string;
  policy_number: string;
  insurer: string;
  expiry_date: string; // ISO date string
  coverage_type: 'personal_endorsed' | 'fleet';
  has_rental_endorsement: boolean;
  rc_amount?: number;
}

/**
 * Insurance verification record
 */
export interface InsuranceVerification {
  id: string;
  car_id: string;
  owner_id: string;
  document_url: string;
  document_type: string;
  policy_number?: string;
  insurer?: string;
  coverage_type?: string;
  expiry_date?: string;
  policyholder_name?: string;
  vehicle_plate?: string;
  has_rc_coverage: boolean;
  has_own_damage_coverage: boolean;
  has_theft_coverage: boolean;
  has_rental_endorsement: boolean;
  rc_amount?: number;
  status: InsuranceVerificationStatus;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleCategory {
  id: string;
  code: string; // 'economy' | 'standard' | 'premium' | 'luxury'
  name: string;
  name_es: string;
  base_daily_rate_pct: number; // 0.0030 = 0.30%
  depreciation_rate_annual: number; // 0.050 = 5% per year
  surge_sensitivity: number; // 1.00 = standard
  description: string;
  display_order: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CarFilters {
  city?: string;
  from?: string;
  to?: string;
  blockedCarIds?: string[];
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
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
