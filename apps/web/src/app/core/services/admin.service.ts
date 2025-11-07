import { Injectable } from '@angular/core';
import {
  Car,
  Booking,
  WithdrawalRequest,
  RefundRequest,
  ProcessRefundParams,
  ProcessRefundResult,
} from '../models';
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
    return ((data ?? []) as unknown[]).map((item) => {
      const typedItem = item as Record<string, unknown>;
      return {
        ...typedItem,
        user_name: (typedItem.user as Record<string, unknown>)?.full_name,
        user_email: (
          (typedItem.user as Record<string, unknown>)?.email as Array<{ email: string }>
        )?.[0]?.email,
      };
    }) as WithdrawalRequest[];
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

  // ============================================
  // REFUND MANAGEMENT
  // ============================================

  async listRefundRequests(status?: string): Promise<RefundRequest[]> {
    const { data, error } = await this.supabase.rpc('admin_get_refund_requests', {
      p_status: status || null,
      p_limit: 100,
      p_offset: 0,
    });

    if (error) throw error;
    return (data ?? []) as RefundRequest[];
  }

  async getRefundRequestById(requestId: string): Promise<RefundRequest | null> {
    const { data, error } = await this.supabase
      .from('refund_requests')
      .select(
        `
        *,
        user:profiles!refund_requests_user_id_fkey(full_name, email:auth.users(email)),
        booking:bookings(total_amount, total_cents, currency, car:cars(title))
      `,
      )
      .eq('id', requestId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Flatten nested data
    const typedData = data as Record<string, unknown>;
    const user = typedData.user as Record<string, unknown>;
    const booking = typedData.booking as Record<string, unknown>;
    const car = booking?.car as Record<string, unknown>;

    return {
      ...typedData,
      user_name: user?.full_name,
      user_email: ((user?.email as Array<{ email: string }>) ?? [])[0]?.email,
      booking_total: booking?.total_amount ?? (booking?.total_cents as number) / 100,
      car_title: car?.title,
    } as RefundRequest;
  }

  async searchBookingsForRefund(
    query: string,
  ): Promise<Array<Booking & { can_refund: boolean; refund_eligible_amount: number }>> {
    // Search by booking ID or user email
    let bookingsQuery = this.supabase
      .from('bookings')
      .select(
        `
        *,
        car:cars(title, brand_text_backup, model_text_backup),
        renter:profiles!bookings_renter_id_fkey(full_name, email:auth.users(email)),
        refund_requests(id, status, refund_amount)
      `,
      )
      .order('created_at', { ascending: false })
      .limit(20);

    // If query looks like a UUID, search by ID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(query)) {
      bookingsQuery = bookingsQuery.eq('id', query);
    }

    const { data, error } = await bookingsQuery;

    if (error) throw error;

    // Process and enrich with refund eligibility
    return ((data ?? []) as unknown[]).map((item) => {
      const typedItem = item as Record<string, unknown>;
      const totalAmount =
        (typedItem.total_amount as number) ?? (typedItem.total_cents as number) / 100;
      const refundRequests = (typedItem.refund_requests as Array<Record<string, unknown>>) ?? [];

      // Calculate already refunded amount
      const refundedAmount = refundRequests
        .filter((r) => r.status !== 'rejected' && r.status !== 'failed')
        .reduce((sum, r) => sum + ((r.refund_amount as number) ?? 0), 0);

      const canRefund =
        typedItem.payment_status === 'paid' ||
        typedItem.payment_status === 'approved' ||
        typedItem.status === 'confirmed';

      return {
        ...typedItem,
        can_refund: canRefund && refundedAmount < totalAmount,
        refund_eligible_amount: totalAmount - refundedAmount,
      } as Booking & { can_refund: boolean; refund_eligible_amount: number };
    });
  }

  async processRefund(params: ProcessRefundParams): Promise<ProcessRefundResult> {
    const { data, error } = await this.supabase.rpc('admin_process_refund', {
      p_booking_id: params.booking_id,
      p_refund_amount: params.refund_amount,
      p_destination: params.destination,
      p_reason: params.reason || null,
    });

    if (error) throw error;

    return data as ProcessRefundResult;
  }

  async rejectRefund(requestId: string, rejectionReason: string): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await this.supabase
      .from('refund_requests')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        rejected_by: user.id,
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) throw error;
  }
}
