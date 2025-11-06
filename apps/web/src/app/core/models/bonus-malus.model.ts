export type BonusMalusType = 'BONUS' | 'MALUS' | 'NEUTRAL';

export interface UserBonusMalus {
  user_id: string;
  total_factor: number;
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
  percentage: number;
  message: string;
  icon: string;
  color: string;
  tips?: string[];
}
