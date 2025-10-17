import { Injectable } from '@angular/core';
import { injectSupabase } from './supabase-client.service';

export interface BookingContract {
  id: string;
  booking_id: string;
  terms_version: string;
  accepted_by_renter: boolean;
  accepted_at: string | null;
  pdf_url: string | null;
  created_at: string;
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
}
