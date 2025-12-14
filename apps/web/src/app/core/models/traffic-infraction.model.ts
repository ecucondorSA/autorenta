export interface TrafficInfraction {
  id: string;
  booking_id: string;
  owner_id: string;
  renter_id: string;
  infraction_date: string;
  amount_cents: number;
  currency: string;
  description: string;
  evidence_urls: string[];
  status: 'pending' | 'accepted' | 'disputed' | 'resolved' | 'charged';
  dispute_reason?: string;
  resolution_notes?: string;
  resolved_by?: string;
  created_at: string;
  renter_name?: string;
  owner_name?: string;
}

