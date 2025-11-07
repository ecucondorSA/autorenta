import { Injectable } from '@angular/core';
import { Car, Booking, WithdrawalRequest } from '../models';
import { injectSupabase } from './supabase-client.service';

// Verification-related interfaces
export interface VerificationQueueItem {
  user_id: string;
  full_name: string;
  email: string;
  current_level: number;

  // Level 2 verification data
  document_type?: string;
  document_number?: string;
  document_front_url?: string;
  document_back_url?: string;
  document_verified_at?: string;
  document_ai_score?: number;

  // Level 3 verification data
  selfie_url?: string;
  selfie_verified_at?: string;
  face_match_score?: number;
  liveness_score?: number;

  // Manual review data
  manual_review_required: boolean;
  manual_review_decision?: 'APPROVED' | 'REJECTED' | 'PENDING';
  manual_review_notes?: string;
  manual_reviewed_by?: string;
  manual_reviewed_at?: string;

  // Metadata
  created_at: string;
  updated_at: string;

  // Extracted data
  extracted_full_name?: string;
  extracted_birth_date?: string;
}

export interface VerificationStats {
  total_users: number;
  pending_reviews: number;
  approved_today: number;
  rejected_today: number;
  level_1_users: number;
  level_2_users: number;
  level_3_users: number;
  pending_level_2: number;
  pending_level_3: number;
}

export interface AdminVerificationResponse {
  success: boolean;
  user_id: string;
  user_email: string;
  user_name: string;
  [key: string]: unknown;
}

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
  // VERIFICATION MANAGEMENT (Issue #125)
  // ============================================

  /**
   * Get pending verifications with filters
   * @param verificationType - 'level_2', 'level_3', or null for all
   * @param status - 'PENDING', 'APPROVED', 'REJECTED', or null for all
   * @param limit - Number of records to return (default 20)
   * @param offset - Pagination offset (default 0)
   */
  async getPendingVerifications(
    verificationType?: string,
    status: string = 'PENDING',
    limit: number = 20,
    offset: number = 0,
  ): Promise<VerificationQueueItem[]> {
    const { data, error } = await this.supabase.rpc('admin_get_pending_verifications', {
      p_verification_type: verificationType || null,
      p_status: status,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) throw error;
    return (data ?? []) as VerificationQueueItem[];
  }

  /**
   * Get verification statistics for admin dashboard
   */
  async getVerificationStats(): Promise<VerificationStats> {
    const { data, error } = await this.supabase.rpc('admin_get_verification_stats');

    if (error) throw error;
    return data as VerificationStats;
  }

  /**
   * Approve a user's verification
   * @param userId - User ID to approve
   * @param verificationLevel - 2 or 3
   * @param notes - Optional admin notes
   */
  async approveVerification(
    userId: string,
    verificationLevel: number,
    notes?: string,
  ): Promise<AdminVerificationResponse> {
    const { data, error } = await this.supabase.rpc('admin_approve_verification', {
      p_user_id: userId,
      p_verification_level: verificationLevel,
      p_notes: notes || null,
    });

    if (error) throw error;

    // Send approval email
    const response = data as AdminVerificationResponse;
    if (response.success && response.user_email) {
      await this.sendVerificationApprovedEmail(response);
    }

    return response;
  }

  /**
   * Reject a user's verification
   * @param userId - User ID to reject
   * @param verificationLevel - 2 or 3
   * @param reason - Required rejection reason
   */
  async rejectVerification(
    userId: string,
    verificationLevel: number,
    reason: string,
  ): Promise<AdminVerificationResponse> {
    if (!reason || reason.trim() === '') {
      throw new Error('El motivo de rechazo es obligatorio');
    }

    const { data, error } = await this.supabase.rpc('admin_reject_verification', {
      p_user_id: userId,
      p_verification_level: verificationLevel,
      p_reason: reason,
    });

    if (error) throw error;

    // Send rejection email
    const response = data as AdminVerificationResponse;
    if (response.success && response.user_email) {
      await this.sendVerificationRejectedEmail(response, reason);
    }

    return response;
  }

  /**
   * Flag a verification as suspicious
   * @param userId - User ID to flag
   * @param notes - Reason for flagging
   */
  async flagVerificationSuspicious(userId: string, notes: string): Promise<AdminVerificationResponse> {
    const { data, error } = await this.supabase.rpc('admin_flag_verification_suspicious', {
      p_user_id: userId,
      p_notes: notes,
    });

    if (error) throw error;
    return data as AdminVerificationResponse;
  }

  /**
   * Request additional documents from user
   * @param userId - User ID
   * @param requestedDocs - Description of what documents are needed
   */
  async requestAdditionalDocuments(
    userId: string,
    requestedDocs: string,
  ): Promise<AdminVerificationResponse> {
    if (!requestedDocs || requestedDocs.trim() === '') {
      throw new Error('La descripción de documentos requeridos es obligatoria');
    }

    const { data, error } = await this.supabase.rpc('admin_request_additional_documents', {
      p_user_id: userId,
      p_requested_docs: requestedDocs,
    });

    if (error) throw error;

    // TODO: Send email notification to user about additional documents request
    return data as AdminVerificationResponse;
  }

  /**
   * Get public URL for identity document
   * @param filePath - Path to file (userId/filename)
   */
  getIdentityDocumentUrl(filePath: string): string {
    const { data } = this.supabase.storage.from('identity-documents').getPublicUrl(filePath);
    return data.publicUrl;
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Send verification approved email via Edge Function
   */
  private async sendVerificationApprovedEmail(response: AdminVerificationResponse): Promise<void> {
    try {
      const { error } = await this.supabase.functions.invoke('send-verification-approved-email', {
        body: {
          user_id: response.user_id,
          user_email: response.user_email,
          user_name: response.user_name,
          approved_level: response.approved_level,
          previous_level: response.previous_level,
          notes: response.notes,
        },
      });

      if (error) {
        console.error('Error sending approval email:', error);
        // Don't throw - email is not critical for the approval process
      }
    } catch (error) {
      console.error('Failed to send approval email:', error);
      // Don't throw - email is not critical
    }
  }

  /**
   * Send verification rejected email via Edge Function
   */
  private async sendVerificationRejectedEmail(
    response: AdminVerificationResponse,
    reason: string,
  ): Promise<void> {
    try {
      const { error } = await this.supabase.functions.invoke('send-verification-rejected-email', {
        body: {
          user_id: response.user_id,
          user_email: response.user_email,
          user_name: response.user_name,
          rejected_level: response.rejected_level,
          reason: reason,
        },
      });

      if (error) {
        console.error('Error sending rejection email:', error);
        // Don't throw - email is not critical
      }
    } catch (error) {
      console.error('Failed to send rejection email:', error);
      // Don't throw - email is not critical
    }
  }
}
