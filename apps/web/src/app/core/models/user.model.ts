export type KycStatus = 'not_started' | 'pending' | 'verified' | 'rejected';
export type OnboardingStatus = 'incomplete' | 'complete';
export type DocumentKind =
  | 'gov_id_front'
  | 'gov_id_back'
  | 'driver_license'
  | 'vehicle_registration'
  | 'vehicle_insurance'
  | 'utility_bill'
  | 'selfie';

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
  role: import('../types/database.types').UserRole;

  wallet_account_number?: string | null;

  phone?: string | null;
  whatsapp?: string | null;

  gov_id_type?: string | null;
  gov_id_number?: string | null;
  driver_license_number?: string | null;
  driver_license_country?: string | null;
  driver_license_expiry?: string | null;

  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;

  home_latitude?: number | null;
  home_longitude?: number | null;
  location_verified_at?: string | null;
  preferred_search_radius_km?: number | null;

  timezone: string;
  locale: string;
  currency: string;
  default_currency?: string;

  kyc: KycStatus;
  onboarding: OnboardingStatus;

  tos_accepted_at?: string | null;
  marketing_opt_in: boolean;

  notif_prefs: NotificationPrefs;

  rating_avg: number;
  rating_count: number;

  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_driver_verified: boolean;
  is_admin?: boolean;

  can_publish_cars?: boolean;
  can_book_cars?: boolean;

  mercadopago_collector_id?: string | null;
  mercadopago_connected?: boolean;
  mercadopago_connected_at?: string | null;
  mercadopago_access_token?: string | null;
  mercadopago_refresh_token?: string | null;
  mercadopago_access_token_expires_at?: string | null;
  mercadopago_public_key?: string | null;
  mercadopago_account_type?: string | null;
  mercadopago_country?: string | null;
  mercadopago_site_id?: string | null;
  mercadopago_oauth_state?: string | null;

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
  analyzed_at?: string | null;
}

export type VerificationRole = 'driver' | 'owner';
export type VerificationStatus = 'VERIFICADO' | 'PENDIENTE' | 'RECHAZADO';

export interface UserVerificationStatus {
  user_id: string;
  role: VerificationRole;
  status: VerificationStatus;
  missing_docs: string[];
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at: string;
}

export interface ProfileAudit {
  id: string;
  user_id: string;
  changed_by: string;
  changes: Record<string, unknown>;
  created_at: string;
}

export interface CarOwner {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
}
