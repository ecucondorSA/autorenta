/**
 * Shared models and types for Rentarfast chatbot
 */

export interface IntentResult {
  handled: boolean;
  navigateTo?: string;
  queryParams?: Record<string, string>;
  scrollToBottom?: boolean;
}

export interface RentarfastContext {
  market?: { country?: string; city?: string };
  location?: { lat: number; lng: number; address?: string };
  pickupPreference?: 'owner_address' | 'office' | 'airport' | 'custom';
  dropoffPreference?: 'owner_address' | 'office' | 'airport' | 'custom';
  addressHint?: string;
}

export interface NearestCarInfo {
  id: string;
  title: string;
  price_per_day: number;
  currency: string;
  distance_km?: number;
}

export interface BookingCommand {
  carId: string;
  startDate: string;
  endDate: string;
}

export interface PickupPreference {
  pickup: 'owner_address' | 'office' | 'airport' | 'custom';
  dropoff?: 'owner_address' | 'office' | 'airport' | 'custom';
  sameLocation?: boolean;
  addressHint?: string;
}

export type CapabilityAction = 'search_cars' | 'calculate_price' | 'stats' | 'help';

export type PersonalInfoKind = 'name' | 'email' | 'dni';
