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

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  phone?: string | null;
  dni?: string | null;
  country: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Car {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  brand: string;
  model: string;
  year: number;
  plate?: string | null;
  vin?: string | null;
  transmission: Transmission;
  fuel: FuelType;
  seats: number;
  doors: number;
  color: string;
  features: Record<string, boolean>; // {ac: true, abs: true, airbag: true}
  status: CarStatus;
  price_per_day: number;
  currency: string;
  rating_avg: number;
  rating_count: number;
  location_city: string;
  location_state: string;
  location_province: string;
  location_country: string;
  location_lat?: number | null;
  location_lng?: number | null;
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
