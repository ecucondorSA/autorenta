export interface Organization {
  id: string;
  owner_id: string;
  name: string;
  tax_id?: string;
  type: 'fleet' | 'corporate' | 'agency';
  verified: boolean;
  logo_url?: string;
  website?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'manager' | 'driver';
  joined_at: string;
}

export interface BonusProgress {
  car_id: string;
  trips_completed: number;
  trips_required: number;
  avg_rating: number;
  min_rating_required: number;
  bonus_amount_usd: number;
  status: 'pending' | 'eligible' | 'paid' | 'expired';
}
