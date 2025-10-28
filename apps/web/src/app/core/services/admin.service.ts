import { Injectable } from '@angular/core';
import { Car, Booking, WithdrawalRequest } from '../models';
import { injectSupabase } from './supabase-client.service';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly supabase = injectSupabase();

  async approveCar(carId: string): Promise<void> {
    const { error } = await this.supabase.from('cars').update({ status: 'active' }).eq('id', carId);
    if (error) throw error;
  }

  async listPendingCars(): Promise<Car[]> {
    const { data, error } = await this.supabase
      .from('cars')
      .select('*, car_photos(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Car[];
  }

  async listRecentBookings(limit: number = 20): Promise<Booking[]> {
    const { data, error } = await this.supabase
      .from('bookings')
      .select('*, cars(*), profiles(*)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as Booking[];
  }

  // ============================================
  // WITHDRAWAL MANAGEMENT
  // ============================================

  async listWithdrawalRequests(status?: string): Promise<WithdrawalRequest[]> {
    let query = this.supabase
      .from('withdrawal_requests')
      .select(
        `
        *,
        user:profiles!withdrawal_requests_user_id_fkey(full_name, email:auth.users(email)),
        bank_account:bank_accounts(*)
      `,
      )
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Flatten nested data structure
    return (data ?? []).map((item: Record<string, unknown>) => ({
      ...item,
      user_name: (item.user as Record<string, unknown>)?.full_name,
      user_email: ((item.user as Record<string, unknown>)?.email as Array<{ email: string }>)?.[0]?.email,
    })) as WithdrawalRequest[];
  }

  async approveWithdrawal(requestId: string, adminNotes?: string): Promise<void> {
    const { error } = await this.supabase.rpc('wallet_approve_withdrawal', {
      p_request_id: requestId,
      p_admin_notes: adminNotes,
    });
    if (error) throw error;
  }

  async completeWithdrawal(
    requestId: string,
    providerTransactionId: string,
    providerMetadata?: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await this.supabase.rpc('wallet_complete_withdrawal', {
      p_request_id: requestId,
      p_provider_transaction_id: providerTransactionId,
      p_provider_metadata: providerMetadata,
    });
    if (error) throw error;
  }

  async failWithdrawal(requestId: string, failureReason: string): Promise<void> {
    const { error } = await this.supabase.rpc('wallet_fail_withdrawal', {
      p_request_id: requestId,
      p_failure_reason: failureReason,
    });
    if (error) throw error;
  }

  async rejectWithdrawal(requestId: string, rejectionReason: string): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await this.supabase
      .from('withdrawal_requests')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) throw error;
  }
}
