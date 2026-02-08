import { Injectable, inject } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

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
  resolution_amount?: number | null;
  resolution_currency?: string | null;
  responsible_party_id?: string | null;
  internal_notes: string | null;
  metadata: Record<string, unknown>;
  booking?: {
    id: string;
    deposit_amount_cents: number;
    [key: string]: unknown;
  };
  [key: string]: unknown; // Index signature for DatabaseRecord compatibility
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
  [key: string]: unknown;
}

export interface DisputeEvidence {
  id: string;
  dispute_id: string;
  url: string;
  path?: string; // Some views use path
  note?: string; // Some views use note
  type: 'image' | 'video' | 'document';
  uploaded_at: string;
  created_at?: string; // Alias for uploaded_at
  uploaded_by: string;
}

@Injectable({
  providedIn: 'root',
})
export class DisputesService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService);

  async listAllForAdmin(): Promise<Dispute[]> {
    const { data, error } = await this.supabase
      .from('disputes')
      .select('*, profiles:opened_by(full_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Dispute[];
  }

  async listByBooking(bookingId: string): Promise<Dispute[]> {
    const { data, error } = await this.supabase
      .from('disputes')
      .select('*')
      .eq('booking_id', bookingId)
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

  /**
   * Resolve a dispute - supports multiple call signatures:
   * 1. resolveDispute(disputeId, status) - Simple status update
   * 2. resolveDispute(disputeId, status, amount, currency, responsiblePartyId) - Admin resolve with amount
   * 3. resolveDispute({...params}) - Object-based call
   */
  async resolveDispute(
    disputeIdOrParams: string | {
      disputeId: string;
      resolutionFavor: 'owner' | 'renter' | 'none';
      penaltyCents: number;
      internalNotes: string;
      publicNotes: string;
    },
    status?: DisputeStatus,
    amount?: number | null,
    _currency?: string,
    _responsiblePartyId?: string | null,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Handle object-based call
      if (typeof disputeIdOrParams === 'object') {
        const params = disputeIdOrParams;
        const { error } = await this.supabase.rpc('resolve_dispute', {
          p_dispute_id: params.disputeId,
          p_resolution_favor: params.resolutionFavor,
          p_penalty_cents: params.penaltyCents,
          p_internal_notes: params.internalNotes,
          p_public_notes: params.publicNotes,
        });

        if (error) throw error;
        return { success: true };
      }

      // Handle positional arguments
      const disputeId = disputeIdOrParams;

      // Simple status update (no RPC, just direct update)
      if (status && !amount) {
        const { error } = await this.supabase
          .from('disputes')
          .update({ status })
          .eq('id', disputeId);

        if (error) throw error;
        return { success: true };
      }

      // Admin resolve with amount
      const { error } = await this.supabase
        .from('disputes')
        .update({
          status: status || 'resolved',
          resolution_amount: amount,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', disputeId);

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

  async createDispute(params: {
    bookingId: string;
    kind: DisputeKind;
    description?: string;
  }): Promise<Dispute> {
    const { data, error } = await this.supabase
      .from('disputes')
      .insert({
        booking_id: params.bookingId,
        kind: params.kind,
        description: params.description || null,
        status: 'open',
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as Dispute;
  }

  async addEvidence(
    disputeId: string,
    note: string,
    fileOrMessage?: File | string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // If it's a string, add it as a comment to the timeline
      if (typeof fileOrMessage === 'string') {
        const { error: insertError } = await this.supabase
          .from('dispute_timeline')
          .insert({
            dispute_id: disputeId,
            event_type: 'comment',
            body: fileOrMessage,
          });

        if (insertError) throw insertError;
        return { success: true };
      }

      // If no file/message provided, just add the note as a comment
      if (!fileOrMessage) {
        if (note) {
          const { error: insertError } = await this.supabase
            .from('dispute_timeline')
            .insert({
              dispute_id: disputeId,
              event_type: 'comment',
              body: note,
            });

          if (insertError) throw insertError;
        }
        return { success: true };
      }

      // Otherwise, handle file upload
      const file = fileOrMessage;
      const fileName = `disputes/${disputeId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await this.supabase.storage
        .from('evidence')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('evidence')
        .getPublicUrl(fileName);

      // Insert evidence record
      const { error: insertError } = await this.supabase
        .from('dispute_evidence')
        .insert({
          dispute_id: disputeId,
          url: urlData.publicUrl,
          path: fileName,
          note,
          type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document',
        });

      if (insertError) throw insertError;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al agregar evidencia',
      };
    }
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
      this.logger.error('Error fetching evidence:', error);
      return [];
    }
    return (data as DisputeEvidence[]) || [];
  }
}
