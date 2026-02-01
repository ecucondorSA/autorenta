import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';

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
  resolution_favor: 'owner' | 'renter' | 'none' | null;
  penalty_amount_cents: number | null;
  internal_notes: string | null;
  metadata: Record<string, unknown>;
  booking?: {
    id: string;
    deposit_amount_cents: number;
    [key: string]: unknown;
  };
}

export interface DisputeTimelineEvent {
  id: string;
  dispute_id: string;
  user_id: string | null;
  event_type: 'status_change' | 'evidence_added' | 'comment' | 'resolution';
  from_status: string | null;
  to_status: string | null;
  body: string | null;
  created_at: string;
}

export interface DisputeEvidence {
  id: string;
  dispute_id: string;
  url: string;
  path?: string; // Some views use path
  note?: string; // Some views use note
  type: 'image' | 'video' | 'document';
  uploaded_at: string;
  uploaded_by: string;
}

@Injectable({
  providedIn: 'root',
})
export class DisputesService {
  private readonly supabase = inject(SupabaseClientService);

  async listAllForAdmin(): Promise<Dispute[]> {
    const { data, error } = await this.supabase
      .from('disputes')
      .select('*, profiles:opened_by(full_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Dispute[];
  }

  async getTimeline(disputeId: string): Promise<DisputeTimelineEvent[]> {
    const { data, error } = await this.supabase
      .from('dispute_timeline')
      .select('*')
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as DisputeTimelineEvent[];
  }

  async resolveDispute(params: {
    disputeId: string;
    resolutionFavor: 'owner' | 'renter' | 'none';
    penaltyCents: number;
    internalNotes: string;
    publicNotes: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.rpc('resolve_dispute', {
        p_dispute_id: params.disputeId,
        p_resolution_favor: params.resolutionFavor,
        p_penalty_cents: params.penaltyCents,
        p_internal_notes: params.internalNotes,
        p_public_notes: params.publicNotes,
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

  async getDisputeById(disputeId: string): Promise<Dispute | undefined> {
    const { data, error } = await this.supabase
      .from('disputes')
      .select('*, booking:booking_id(*)')
      .eq('id', disputeId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    return data as Dispute;
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

  async listEvidence(disputeId: string): Promise<DisputeEvidence[]> {
    const { data, error } = await this.supabase
      .from('dispute_evidence')
      .select('*')
      .eq('dispute_id', disputeId);

    if (error) {
      console.error('Error fetching evidence:', error);
      return [];
    }
    return (data as DisputeEvidence[]) || [];
  }
}
