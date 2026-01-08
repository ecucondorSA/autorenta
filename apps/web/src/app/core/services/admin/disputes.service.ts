import { Injectable } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

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
  resolution_amount: number | null; // Monto a pagar/cobrar como parte de la resolución
  resolution_currency: string | null; // Moneda del monto
  responsible_party_id: string | null; // ID del usuario responsable de la resolución (ej. quien debe pagar)
  dispute_resolution: string | null; // NEW: field for resolution reason/notes
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
      .update({
        status,
        resolved_at: new Date().toISOString(),
        resolved_by: (await this.supabase.auth.getUser()).data.user?.id,
      })
      .eq('id', disputeId);
    if (error) throw error;
  }

  async resolveDispute(
    disputeId: string,
    status: DisputeStatus, // Should be 'resolved' or 'rejected'
    resolutionAmount: number | null = null,
    resolutionCurrency: string | null = null,
    responsiblePartyId: string | null = null,
    resolutionReason: string | null = null, // NEW: Added resolutionReason parameter
  ): Promise<void> {
    const { error } = await this.supabase
      .from('disputes')
      .update({
        status,
        resolved_at: new Date().toISOString(),
        resolved_by: (await this.supabase.auth.getUser()).data.user?.id,
        resolution_amount: resolutionAmount,
        resolution_currency: resolutionCurrency,
        responsible_party_id: responsiblePartyId,
        dispute_resolution: resolutionReason, // NEW: Updated dispute_resolution field
      })
      .eq('id', disputeId);
    if (error) throw error;
  }

  // ============================================================================
  // RPC INTEGRATIONS - Funciones de backend conectadas
  // ============================================================================

  /**
   * Abre una disputa usando la función RPC del backend
   * Esta función maneja la lógica completa incluyendo notificaciones y bloqueos
   */
  async openDisputeRpc(params: {
    bookingId: string;
    kind: DisputeKind;
    description?: string;
    claimedAmountCents?: number;
  }): Promise<{ success: boolean; disputeId?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('open_dispute', {
        p_booking_id: params.bookingId,
        p_kind: params.kind,
        p_description: params.description || null,
        p_claimed_amount_cents: params.claimedAmountCents || null,
      });

      if (error) throw error;

      return {
        success: true,
        disputeId: data?.dispute_id || data?.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al abrir disputa',
      };
    }
  }

  /**
   * Resuelve una disputa usando la función RPC del backend (Admin)
   * Maneja la distribución de fondos y notificaciones automáticamente
   */
  async resolveDisputeRpc(params: {
    disputeId: string;
    resolution: 'favor_renter' | 'favor_owner' | 'split' | 'rejected';
    resolutionAmountCents?: number;
    resolutionNotes?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.rpc('resolve_dispute', {
        p_dispute_id: params.disputeId,
        p_resolution: params.resolution,
        p_resolution_amount_cents: params.resolutionAmountCents || null,
        p_resolution_notes: params.resolutionNotes || null,
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al resolver disputa',
      };
    }
  }

  /**
   * Obtiene detalles completos de una disputa incluyendo evidencias y timeline
   */
  async getDisputeDetails(disputeId: string): Promise<{
    dispute: Dispute | null;
    evidence: DisputeEvidence[];
    timeline: Array<{ action: string; timestamp: string; actor?: string }>;
  } | null> {
    try {
      const { data, error } = await this.supabase.rpc('get_dispute_details', {
        p_dispute_id: disputeId,
      });

      if (error) throw error;

      return data as {
        dispute: Dispute | null;
        evidence: DisputeEvidence[];
        timeline: Array<{ action: string; timestamp: string; actor?: string }>;
      };
    } catch {
      // Fallback to manual fetch if RPC not available
      const dispute = await this.getDisputeById(disputeId);
      const evidence = dispute ? await this.listEvidence(disputeId) : [];
      return {
        dispute: dispute || null,
        evidence,
        timeline: [],
      };
    }
  }
}
