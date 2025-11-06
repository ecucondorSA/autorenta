import type { CarStatus, FuelType, Transmission, CancelPolicy } from '../types/database.types';
import type { CarOwner } from './user.model';

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
  | 'registration'
  | 'insurance'
  | 'technical_inspection'
  | 'circulation_permit'
  | 'ownership_proof';

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

  brand_id: string;
  model_id: string;
  region_id?: string | null;

  brand_text_backup: string;
  model_text_backup: string;

  brand?: string;
  model?: string;
  brand_name?: string;
  model_name?: string;

  year: number;
  plate?: string | null;
  vin?: string | null;
  transmission: Transmission;
  fuel: FuelType;
  fuel_type: FuelType;
  seats: number;
  doors: number;
  color: string;
  features: Record<string, boolean>;
  status: CarStatus;
  price_per_day: number;
  currency: string;
  value_usd?: number;
  rating_avg: number;
  rating_count: number;

  location_city: string;
  location_state: string;
  location_province: string;
  location_country: string;
  location_lat?: number | null;
  location_lng?: number | null;

  location_street?: string | null;
  location_street_number?: string | null;
  location_neighborhood?: string | null;
  location_postal_code?: string | null;
  location_formatted_address?: string | null;

  payment_methods?: string[];
  deposit_required?: boolean;
  deposit_amount?: number;
  insurance_included?: boolean;
  auto_approval?: boolean;
  min_rental_days?: number;
  max_rental_days?: number;
  terms_and_conditions?: string;
  delivery_options?: string[];

  mileage: number;
  cancel_policy: CancelPolicy;
  photos?: CarPhoto[];
  car_photos?: CarPhoto[];
  images?: string[];
  owner?: CarOwner;
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

export interface CarComparison {
  carIds: string[];
  timestamp: string;
}

export interface ComparisonRow {
  label: string;
  category: 'basic' | 'specs' | 'pricing' | 'location' | 'owner';
  values: (string | number | boolean | null)[];
  highlightBest?: boolean;
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
