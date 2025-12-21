import { Injectable } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

export interface BookingContract {
  id: string;
  booking_id: string;
  terms_version: string;
  accepted_by_renter: boolean;
  accepted_at: string | null;
  pdf_url: string | null;
  created_at: string;
  // Extended fields for legal compliance
  contract_version?: string;
  contract_locale?: string;
  renter_ip_address?: string;
  renter_user_agent?: string;
  renter_device_fingerprint?: string;
  pdf_generated_at?: string;
  pdf_storage_path?: string;
  pdf_generation_status?: 'pending' | 'generating' | 'ready' | 'failed';
  pdf_error?: string;
  contract_data?: Record<string, unknown>; // JSONB snapshot
  clauses_accepted?: ClausesAccepted;
}

export interface ClausesAccepted {
  culpaGrave: boolean; // Alcohol/drogas - Pérdida total de cobertura
  indemnidad: boolean; // Renter indemnifica owner
  retencion: boolean; // Art. 173 CP - Retención indebida
  mora: boolean; // Art. 886 CCyC - Mora automática
}

@Injectable({
  providedIn: 'root',
})
export class ContractsService {
  private readonly supabase = injectSupabase();

  async prepareContract(params: {
    bookingId: string;
    termsVersion: string;
    pdfUrl?: string;
  }): Promise<BookingContract> {
    const { data, error } = await this.supabase
      .from('booking_contracts')
      .insert({
        booking_id: params.bookingId,
        terms_version: params.termsVersion,
        pdf_url: params.pdfUrl ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as BookingContract;
  }

  async acceptContract(contractId: string): Promise<void> {
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();
    if (authError) throw authError;
    if (!user?.id) throw new Error('Usuario no autenticado');

    const { error } = await this.supabase
      .from('booking_contracts')
      .update({
        accepted_by_renter: true,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', contractId);
    if (error) throw error;
  }

  async getContractByBooking(bookingId: string): Promise<BookingContract | null> {
    const { data, error } = await this.supabase
      .from('booking_contracts')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle();
    if (error) throw error;
    return (data as BookingContract | null) ?? null;
  }

  /**
   * Accept contract with full metadata for legal compliance (Ley 25.506)
   * Validates all 4 priority clauses and captures audit trail
   */
  async acceptContractWithMetadata(params: {
    bookingId: string;
    clausesAccepted: ClausesAccepted;
    ipAddress: string;
    userAgent: string;
    deviceFingerprint: string;
  }): Promise<void> {
    // 1. Get contract record
    const contract = await this.getContractByBooking(params.bookingId);
    if (!contract) {
      throw new Error('Contract not found for this booking');
    }

    // 2. Validate all 4 clauses accepted
    const allAccepted = Object.values(params.clausesAccepted).every((v) => v === true);
    if (!allAccepted) {
      throw new Error('Debes aceptar TODAS las cláusulas para continuar');
    }

    // 3. Validate auth
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();
    if (authError) throw authError;
    if (!user?.id) throw new Error('Usuario no autenticado');

    // 4. Update contract with full metadata
    const { error } = await this.supabase
      .from('booking_contracts')
      .update({
        accepted_by_renter: true,
        accepted_at: new Date().toISOString(),
        clauses_accepted: params.clausesAccepted,
        renter_ip_address: params.ipAddress,
        renter_user_agent: params.userAgent,
        renter_device_fingerprint: params.deviceFingerprint,
      })
      .eq('id', contract.id);

    if (error) throw error;
  }
}
