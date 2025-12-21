/**
 * Marketplace Models
 *
 * Types and interfaces for the marketplace landing page.
 * Centralized to enable code splitting and better maintainability.
 */

import type { Car } from './index';

// ============================================
// VIEW & SORTING
// ============================================

export type ViewMode = 'grid' | 'list' | 'map';

export type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'distance' | 'rating' | 'score';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'distance', label: 'Más cercanos' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'rating', label: 'Mejor valorados' },
  { value: 'relevance', label: 'Relevancia' },
];

// ============================================
// FILTER STATE
// ============================================

export interface FilterState {
  dateRange: { start: Date; end: Date } | null;
  priceRange: { min: number; max: number } | null;
  vehicleTypes: string[] | null;
  immediateOnly: boolean;
  transmission: string[] | null;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  dateRange: null,
  priceRange: null,
  vehicleTypes: null,
  immediateOnly: false,
  transmission: null,
};

export interface QuickFilter {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
}

export const QUICK_FILTERS: QuickFilter[] = [
  { id: 'immediate', label: 'Entrega inmediata', icon: '⚡' },
  { id: 'verified', label: 'Dueño verificado', icon: '✓' },
  { id: 'no-card', label: 'Sin tarjeta', icon: '💳' },
  { id: 'near-me', label: 'Cerca de mí', icon: '📍' },
  { id: 'electric', label: 'Eléctrico', icon: '🔋' },
];

// ============================================
// MAP & LOCATION
// ============================================

export interface LatLngBoundsLiteral {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface LocationCoords {
  lat: number;
  lng: number;
}

export interface LocationSuggestion {
  placeName: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
}

// ============================================
// CAR EXTENSIONS
// ============================================

export interface CarWithDistance extends Car {
  distance?: number;
  distanceText?: string;
}

// CarMapLocation is exported from car-locations.service.ts
// Re-export for backward compatibility
export type { CarMapLocation } from '@core/services/cars/car-locations.service';

// ============================================
// UI STATE
// ============================================

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastConfig {
  message: string;
  type: ToastType;
  duration?: number;
}

export interface Stat {
  label: string;
  value: string | number;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
}

export type MarkerVariant = 'photo' | 'price';

// ============================================
// SEARCH STATE
// ============================================

export interface DateRange {
  from: string | null;
  to: string | null;
}

export interface SearchState {
  query: string;
  location: LocationCoords | null;
  dateRange: DateRange;
  filters: FilterState;
  quickFilters: Set<string>;
  sortOrder: SortOption;
  radiusKm: number;
}

export const DEFAULT_SEARCH_STATE: SearchState = {
  query: '',
  location: null,
  dateRange: { from: null, to: null },
  filters: DEFAULT_FILTER_STATE,
  quickFilters: new Set(),
  sortOrder: 'distance',
  radiusKm: 5,
};

// ============================================
// MARKETPLACE STATE (Global)
// ============================================

export interface MarketplaceState {
  // Data
  cars: Car[];
  loading: boolean;
  error: string | null;

  // Selection
  selectedCarId: string | null;

  // Location
  userLocation: LocationCoords | null;
  mapBounds: LatLngBoundsLiteral | null;

  // Search & Filters
  search: SearchState;

  // UI
  viewMode: ViewMode;
  drawerOpen: boolean;
  filtersVisible: boolean;
  showSearchAreaButton: boolean;
}

export const DEFAULT_MARKETPLACE_STATE: MarketplaceState = {
  cars: [],
  loading: false,
  error: null,
  selectedCarId: null,
  userLocation: null,
  mapBounds: null,
  search: DEFAULT_SEARCH_STATE,
  viewMode: 'list',
  drawerOpen: false,
  filtersVisible: true,
  showSearchAreaButton: false,
};

// ============================================
// FAB ACTIONS
// ============================================

export interface FabAction {
  id: string;
  label: string;
  icon: string;
  color: 'primary' | 'secondary' | 'accent' | 'warn';
}

export const MARKETPLACE_FAB_ACTIONS: FabAction[] = [
  { id: 'filter', label: 'Filtros', icon: '🔍', color: 'primary' },
  { id: 'quick-rent', label: 'Reserva rápida', icon: '⚡', color: 'accent' },
  { id: 'location', label: 'Mi ubicación', icon: '📍', color: 'secondary' },
];

// ============================================
// 3D MODEL
// ============================================

export type Car3DViewMode = 'default' | 'front' | 'side' | 'interior' | 'top';

export interface Car3DState {
  currentView: Car3DViewMode;
  modelLoaded: boolean;
  hoveredPart: CarPartInfo | null;
  hoveredPartPosition: { x: number; y: number } | null;
  selectedPart: CarPartInfo | null;
}

export interface CarPartInfo {
  name: string;
  description: string;
  category: 'exterior' | 'interior' | 'engine' | 'wheels';
  icon?: string;
}

// ============================================
// ANALYTICS EVENTS
// ============================================

export type MarketplaceAnalyticsEvent =
  | 'car_details_clicked'
  | 'quick_book_initiated'
  | 'booking_completed'
  | 'booking_failed'
  | 'filters_applied'
  | 'search_submitted'
  | 'view_mode_changed'
  | 'location_updated'
  | 'price_transparency_modal_viewed'
  | '3d_part_selected';

export interface MarketplaceAnalyticsPayload {
  car_id?: string;
  source?: string;
  cta_type?: string;
  payment_method?: string;
  total_amount?: number;
  error_message?: string;
  search_query?: string;
  filters?: Partial<FilterState>;
  view_mode?: ViewMode;
  [key: string]: unknown;
}

// ============================================
// SEO & SOCIAL PROOF
// ============================================

export interface SocialProofStat {
  id: string;
  value: number;
  label: string;
  icon: string;
  suffix?: string;
  prefix?: string;
  animationDuration?: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role: 'renter' | 'owner';
  avatar?: string;
  rating: number;
  text: string;
  date: string;
  location?: string;
  verified: boolean;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'booking' | 'payment' | 'insurance' | 'cancellation';
}

export interface TrustBadge {
  id: string;
  label: string;
  icon: string;
  description?: string;
}

export const TRUST_BADGES: TrustBadge[] = [
  {
    id: 'insurance',
    label: '100% Asegurado',
    icon: '🛡️',
    description: 'Seguro incluido en todas las rentas',
  },
  {
    id: 'payment',
    label: 'Pagos Seguros',
    icon: '💳',
    description: 'MercadoPago protege tu dinero',
  },
  { id: 'verified', label: 'Dueños Verificados', icon: '✓', description: 'Identidad verificada' },
  { id: 'support', label: 'Soporte 24/7', icon: '📞', description: 'Asistencia en todo momento' },
];

// ============================================
// PARTNER LOGOS
// ============================================

export interface PartnerLogo {
  name: string;
  logoUrl: string;
  altText: string;
}

// ============================================
// URGENCY INDICATORS
// ============================================

export interface UrgencyIndicator {
  type: 'low_stock' | 'high_demand' | 'limited_time' | 'popular';
  message: string;
  count?: number;
  expiresAt?: Date;
}

export function getUrgencyMessage(indicator: UrgencyIndicator): string {
  switch (indicator.type) {
    case 'low_stock':
      return `¡Solo quedan ${indicator.count} disponibles!`;
    case 'high_demand':
      return '🔥 Alta demanda en esta zona';
    case 'limited_time':
      return '⏰ Oferta por tiempo limitado';
    case 'popular':
      return `⭐ ${indicator.count} personas viendo ahora`;
    default:
      return indicator.message;
  }
}
