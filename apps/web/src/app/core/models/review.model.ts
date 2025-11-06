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

  rating_cleanliness: number;
  rating_communication: number;
  rating_accuracy: number;
  rating_location: number;
  rating_checkin: number;
  rating_value: number;

  rating_overall?: number;

  comment_public?: string | null;
  comment_private?: string | null;

  status: ReviewStatus;
  is_visible: boolean;
  published_at?: string | null;

  is_flagged: boolean;
  flag_reason?: string | null;
  flagged_by?: string | null;
  flagged_at?: string | null;
  moderation_status: ModerationStatus;
  moderated_by?: string | null;
  moderated_at?: string | null;
  moderation_notes?: string | null;

  created_at: string;

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

  owner_reviews_count: number;
  owner_rating_avg: number;
  owner_rating_cleanliness_avg: number;
  owner_rating_communication_avg: number;
  owner_rating_accuracy_avg: number;
  owner_rating_location_avg: number;
  owner_rating_checkin_avg: number;
  owner_rating_value_avg: number;

  renter_reviews_count: number;
  renter_rating_avg: number;
  renter_rating_cleanliness_avg: number;
  renter_rating_communication_avg: number;
  renter_rating_accuracy_avg: number;
  renter_rating_checkin_avg: number;

  total_bookings_as_owner: number;
  total_bookings_as_renter: number;
  cancellation_count: number;
  cancellation_rate: number;

  is_top_host: boolean;
  is_super_host: boolean;
  is_verified_renter: boolean;
  badges: Badge[];

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
