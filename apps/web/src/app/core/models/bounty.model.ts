/**
 * Bounty (Scout Mission) Models
 * Canonical type for bounties/missions in the Scout system.
 */

export interface Bounty {
  id: string;
  car_id: string;
  reward_amount: number;
  reward_currency: string;
  status: 'OPEN' | 'claimed' | 'verified';
  cars?: {
    brand: string;
    model: string;
    color: string;
    license_plate: string;
    photos: string[];
    year?: number;
  };
  lat: number;
  lng: number;
}

/** Simplified view for map markers (derived from Bounty) */
export interface BountyMapItem {
  id: string;
  lat: number;
  lng: number;
  reward: number;
  carModel: string;
  lastSeen: string;
}
