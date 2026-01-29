export interface ParticipationPeriod {
  id: string; // uuid
  car_id: string; // FK to cars table
  owner_id: string; // FK to profiles table
  period: string; // 'YYYY-MM' format, e.g., '2026-01'

  // Base Metrics
  total_hours_in_period: number; // e.g., 720h or 744h
  available_hours: number; // Hours the car was marked as 'available'
  days_used: number; // Days with effective bookings

  // Factors (Snapshot at period close)
  location_factor: number; // 0.5 - 2.0 (based on zone demand)
  vehicle_category_factor: number; // 1.0 - 1.5 (Vehicle Range/Gamma)
  owner_rating_at_close: number; // 1.0 - 5.0

  // Participation Points Calculation
  points_availability: number;
  points_location: number;
  points_vehicle: number;
  points_rating: number;
  points_usage_bonus: number;
  total_points: number;

  // Financial Result
  pool_share_percentage: number; // Percentage of the total pool assigned to this period
  earnings_usd: number; // Final amount to pay out to the owner
  currency: string; // 'USD'
  status: 'open' | 'calculated' | 'paid';

  created_at?: string;
  updated_at?: string;
}

export interface NetworkPool {
  id: string;
  period: string; // 'YYYY-MM'

  // Financials
  total_revenue_usd: number; // Gross Revenue collected from users (contributions)
  platform_fee_percentage: number; // e.g., 0.25 (25%) - Covers Insurance, Tech, Support
  platform_revenue_usd: number; // The 25% kept by platform
  distributable_revenue_usd: number; // The 75% to be distributed among participants

  // Metrics
  total_network_points: number; // Sum of total_points of all participating cars
  total_participants_count: number;

  status: 'collecting' | 'closed' | 'distributed';

  created_at?: string;
  updated_at?: string;
}

export interface ParticipationFactorWeight {
  // Configurable weights for point calculation
  availability_weight: number; // 0.40
  location_weight: number; // 0.25
  vehicle_weight: number; // 0.15
  rating_weight: number; // 0.10
  usage_bonus_weight: number; // 0.10
}
