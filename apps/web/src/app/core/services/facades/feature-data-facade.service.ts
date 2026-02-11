import { Injectable } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

@Injectable({
  providedIn: 'root',
})
export class FeatureDataFacadeService {
  private readonly supabase = injectSupabase();

  async getCarOwner(carId: string): Promise<{ id: string; owner_id: string } | null> {
    const { data, error } = await this.supabase
      .from('cars')
      .select('id, owner_id')
      .eq('id', carId)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      owner_id: data.owner_id,
    };
  }

  async getCarReviewInfo(carId: string): Promise<{ id: string; owner_id: string; title: string | null } | null> {
    const { data, error } = await this.supabase
      .from('cars')
      .select('id, owner_id, title')
      .eq('id', carId)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      owner_id: data.owner_id,
      title: (data.title as string | null) ?? null,
    };
  }

  async getReviewByBookingAndReviewer(params: {
    bookingId: string;
    reviewerId: string;
  }): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select('*')
      .eq('booking_id', params.bookingId)
      .eq('reviewer_id', params.reviewerId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as Record<string, unknown>) ?? null;
  }

  async getPricingOverrides(carId: string): Promise<Array<{ day: string; price_per_day: number }>> {
    const { data, error } = await this.supabase
      .from('pricing_overrides')
      .select('day, price_per_day')
      .eq('car_id', carId)
      .order('day', { ascending: true });

    if (error) {
      throw error;
    }

    return (data as Array<{ day: string; price_per_day: number }>) || [];
  }

  async insertNotification(payload: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase.from('notifications').insert(payload);

    if (error) {
      throw error;
    }
  }

  async createManualCarBlock(params: {
    carId: string;
    blockedFrom: string;
    blockedTo: string;
    reason: string;
  }): Promise<void> {
    const { error } = await this.supabase.from('car_blocked_dates').insert({
      car_id: params.carId,
      blocked_from: params.blockedFrom,
      blocked_to: params.blockedTo,
      reason: params.reason,
    });

    if (error) {
      throw error;
    }
  }

  async deleteManualCarBlock(blockId: string): Promise<void> {
    const { error } = await this.supabase.from('car_blocked_dates').delete().eq('id', blockId);

    if (error) {
      throw error;
    }
  }

  async getBookingById(bookingId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error) {
      throw error;
    }

    return (data as Record<string, unknown>) ?? null;
  }

  async getBookingRequestById(bookingId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('bookings')
      .select(
        'id, car_id, start_at, end_at, status, payment_mode, wallet_lock_id, authorized_payment_id, paid_at',
      )
      .eq('id', bookingId)
      .single();

    if (error) {
      throw error;
    }

    return (data as Record<string, unknown>) ?? null;
  }

  async getCarById(carId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase.from('cars').select('*').eq('id', carId).single();

    if (error) {
      throw error;
    }

    return (data as Record<string, unknown>) ?? null;
  }

  async updateBooking(bookingId: string, payload: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase.from('bookings').update(payload).eq('id', bookingId);

    if (error) {
      throw error;
    }
  }

  async getInsuranceCarsByOwner(ownerId: string): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase
      .from('cars')
      .select('id, brand, model, year, status, insurance_policy_number, insurance_expires_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async getUserRole(userId: string): Promise<'owner' | 'renter' | 'both' | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('user_role')
      .eq('id', userId)
      .single();

    if (error) {
      throw error;
    }

    return (data?.user_role as 'owner' | 'renter' | 'both' | null) ?? null;
  }

  async listDisputeEvidence(disputeId: string): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase
      .from('dispute_evidence')
      .select('id, dispute_id, path, note, created_at')
      .eq('dispute_id', disputeId);

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async insertDisputeEvidence(payload: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase.from('dispute_evidence').insert(payload);

    if (error) {
      throw error;
    }
  }

  async insertMarketingLead(payload: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase.from('marketing_leads').insert(payload);

    if (error) {
      throw error;
    }
  }

  async getProfileById(userId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase.from('profiles').select('*').eq('id', userId).single();

    if (error) {
      throw error;
    }

    return (data as Record<string, unknown>) ?? null;
  }

  async getProfileNameById(userId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (error) {
      throw error;
    }

    return (data?.full_name as string | null) ?? null;
  }

  async getRenterAnalysis(params: {
    renterId: string;
    bookingId: string | null;
  }): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase.rpc('get_renter_analysis', {
      p_renter_id: params.renterId,
      p_booking_id: params.bookingId,
    });

    if (error) {
      throw error;
    }

    return (data as Record<string, unknown>) ?? null;
  }

  async getRenterProfileBadge(renterId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase.rpc('get_renter_profile_badge', {
      p_renter_id: renterId,
    });

    if (error) {
      throw error;
    }

    return (data as Record<string, unknown>) ?? null;
  }

  async listOwnerCarsForDocuments(ownerId: string): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase
      .from('cars')
      .select('id, title, brand, model, images')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async listVehicleDocumentsByCarIds(carIds: string[]): Promise<Array<Record<string, unknown>>> {
    if (carIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('vehicle_documents')
      .select(
        'vehicle_id, green_card_verified_at, vtv_verified_at, vtv_expiry, insurance_verified_at, insurance_expiry',
      )
      .in('vehicle_id', carIds);

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async listSecurityDevices(carId: string): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase
      .from('car_security_devices')
      .select('*')
      .eq('car_id', carId);

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async listActiveSecurityAlerts(bookingId: string): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase
      .from('security_alerts')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('resolved', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async triggerBounty(payload: { carId: string; lat: number; lng: number }): Promise<void> {
    const { error } = await this.supabase.from('bounties').insert({
      car_id: payload.carId,
      target_location: `POINT(${payload.lng} ${payload.lat})`,
      status: 'ACTIVE',
    });

    if (error) {
      throw error;
    }
  }

  async invokeFunction<T>(params: {
    name: string;
    body?: Record<string, unknown>;
    accessToken?: string | null;
  }): Promise<T> {
    const { data, error } = await this.supabase.functions.invoke(params.name, {
      body: params.body,
      headers: params.accessToken ? { Authorization: `Bearer ${params.accessToken}` } : {},
    });

    if (error) {
      throw error;
    }

    return data as T;
  }
}
