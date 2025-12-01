import { Injectable } from '@angular/core';
import { injectSupabase } from './supabase-client.service';

export type DisputeKind = 'damage' | 'no_show' | 'late_return' | 'other';
export type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'rejected';

export interface Dispute {
  id: string;
  booking_id: string;
  opened_by: string;
  kind: DisputeKind;
  description: string | null;
  status: DisputeStatus;
  created_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
}

export interface DisputeEvidence {
  id: string;
  dispute_id: string;
  path: string;
  note: string | null;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class DisputesService {
  private readonly supabase = injectSupabase();

  async listByBooking(bookingId: string): Promise<Dispute[]> {
    const { data, error } = await this.supabase
      .from('disputes')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Dispute[];
  }

  async createDispute(params: {
    bookingId: string;
    kind: DisputeKind;
    description?: string;
  }): Promise<Dispute> {
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();
    if (authError) throw authError;
    if (!user?.id) throw new Error('Usuario no autenticado');

    const { data, error } = await this.supabase
      .from('disputes')
      .insert({
        booking_id: params.bookingId,
        opened_by: user.id,
        kind: params.kind,
        description: params.description ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as Dispute;
  }

  async addEvidence(disputeId: string, path: string, note?: string): Promise<void> {
    const { error } = await this.supabase.from('dispute_evidence').insert({
      dispute_id: disputeId,
      path,
      note: note ?? null,
    });
    if (error) throw error;
  }

  async listEvidence(disputeId: string): Promise<DisputeEvidence[]> {
    const { data, error } = await this.supabase
      .from('dispute_evidence')
      .select('*')
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as DisputeEvidence[];
  }

  async getDisputeById(disputeId: string): Promise<Dispute | undefined> {
    const { data, error } = await this.supabase
      .from('disputes')
      .select('*')
      .eq('id', disputeId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return undefined; // No rows found
      throw error;
    }
    return data as Dispute;
  }

  async updateStatus(disputeId: string, status: DisputeStatus): Promise<void> {
    const { error } = await this.supabase
      .from('disputes')
      .update({ status, resolved_at: new Date().toISOString(), resolved_by: (await this.supabase.auth.getUser()).data.user?.id })
      .eq('id', disputeId);
    if (error) throw error;
  }
}
