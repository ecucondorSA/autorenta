/**
 * Feature Flag Model
 * Defines types for the feature flag system
 */

export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  user_segments: UserSegment[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface FeatureFlagOverride {
  id: string;
  feature_flag_id: string;
  user_id: string;
  enabled: boolean;
  reason: string | null;
  created_at: string;
  created_by: string | null;
}

export interface FeatureFlagAuditLog {
  id: string;
  feature_flag_id: string | null;
  feature_flag_name: string;
  action: FeatureFlagAction;
  old_value: Partial<FeatureFlag> | null;
  new_value: Partial<FeatureFlag> | null;
  changed_by: string | null;
  changed_at: string;
}

export type FeatureFlagAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'override_added'
  | 'override_removed';

export interface UserSegment {
  type: SegmentType;
  value: string | string[] | number;
}

export type SegmentType =
  | 'user_id'
  | 'email_domain'
  | 'role'
  | 'registration_date_after'
  | 'registration_date_before'
  | 'has_completed_booking'
  | 'is_owner'
  | 'is_renter'
  | 'country'
  | 'city';

/**
 * Feature flag evaluation context
 * Contains user information needed to evaluate flag eligibility
 */
export interface FeatureFlagContext {
  userId?: string;
  email?: string;
  role?: string;
  registrationDate?: Date;
  hasCompletedBooking?: boolean;
  isOwner?: boolean;
  isRenter?: boolean;
  country?: string;
  city?: string;
  customAttributes?: Record<string, unknown>;
}

/**
 * Result of evaluating a feature flag
 */
export interface FeatureFlagEvaluation {
  flagName: string;
  enabled: boolean;
  reason: EvaluationReason;
  variant?: string;
}

export type EvaluationReason =
  | 'flag_not_found'
  | 'flag_disabled'
  | 'user_override'
  | 'segment_match'
  | 'rollout_percentage'
  | 'default_enabled';

/**
 * Feature flag names enum for type safety
 */
export enum FeatureFlagName {
  NEW_BOOKING_FLOW = 'new_booking_flow',
  WALLET_V2 = 'wallet_v2',
  AI_CAR_DESCRIPTIONS = 'ai_car_descriptions',
  DARK_MODE = 'dark_mode',
  PUSH_NOTIFICATIONS = 'push_notifications',
  MAP_CLUSTERING = 'map_clustering',
}

/**
 * Create feature flag DTO
 */
export interface CreateFeatureFlagDto {
  name: string;
  description?: string;
  enabled?: boolean;
  rollout_percentage?: number;
  user_segments?: UserSegment[];
  metadata?: Record<string, unknown>;
}

/**
 * Update feature flag DTO
 */
export interface UpdateFeatureFlagDto {
  description?: string;
  enabled?: boolean;
  rollout_percentage?: number;
  user_segments?: UserSegment[];
  metadata?: Record<string, unknown>;
}

/**
 * Create feature flag override DTO
 */
export interface CreateFeatureFlagOverrideDto {
  feature_flag_id: string;
  user_id: string;
  enabled: boolean;
  reason?: string;
}
