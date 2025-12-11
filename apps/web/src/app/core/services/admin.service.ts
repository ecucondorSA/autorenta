/**
 * AdminService - Role-Based Access Control & Audit Logging
 * Created: 2025-11-07
 * Issue: #123 - Admin Authentication & Role-Based Access Control
 *
 * This service provides:
 * 1. Admin role checking (super_admin, operations, support, finance)
 * 2. Permission-based authorization
 * 3. Automatic audit logging for all admin actions
 * 4. Admin user management (grant/revoke roles)
 *
 * Usage:
 * ```typescript
 * // Check if user is admin
 * const isAdmin = await adminService.isAdmin();
 *
 * // Check specific permission
 * const canApprove = await adminService.hasPermission('approve_verifications');
 *
 * // Log an action (automatic with decorator, or manual)
 * await adminService.logAction('approve_verification', 'user_verification', verificationId);
 * ```
 */

import { Injectable, inject } from '@angular/core';
import type {
  AdminRole,
  AdminUser,
  AdminUserInsert,
  AdminUserUpdate,
  AdminAuditLog,
  AdminPermission,
  AdminActionContext,
  AdminUserWithProfile,
} from '../types/admin.types';
import {
  RefundRequest,
  ProcessRefundParams,
  ProcessRefundResult,
  WithdrawalRequest,
  Car,
  Booking,
} from '../models';
import { LoggerService } from './logger.service';
import { injectSupabase } from './supabase-client.service';

// Import ADMIN_PERMISSIONS constant
const PERMISSIONS_MATRIX: Record<AdminRole, AdminPermission[]> = {
  super_admin: [
    'view_users',
    'edit_users',
    'suspend_users',
    'delete_users',
    'view_verifications',
    'approve_verifications',
    'reject_verifications',
    'view_bookings',
    'edit_bookings',
    'cancel_bookings',
    'view_payments',
    'process_refunds',
    'view_wallet_transactions',
    'view_cars',
    'approve_cars',
    'suspend_cars',
    'view_audit_log',
    'manage_admins',
    'grant_admin_roles',
    'revoke_admin_roles',
  ],
  operations: [
    'view_users',
    'edit_users',
    'suspend_users',
    'view_verifications',
    'approve_verifications',
    'reject_verifications',
    'view_bookings',
    'edit_bookings',
    'cancel_bookings',
    'view_cars',
    'approve_cars',
    'suspend_cars',
  ],
  support: ['view_users', 'view_verifications', 'view_bookings', 'view_cars'],
  finance: [
    'view_users',
    'view_bookings',
    'view_payments',
    'process_refunds',
    'view_wallet_transactions',
  ],
};

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
  private readonly logger = inject(LoggerService);

  // Cache for admin roles (cleared on auth state change)
  private rolesCache: AdminRole[] | null = null;
  private rolesCacheUserId: string | null = null;

  // ============================================================================
  // ROLE & PERMISSION CHECKING
  // ============================================================================

  /**
   * Check if current user is an admin (has any admin role)
   */
  async isAdmin(): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await this.supabase.rpc('is_admin', {
        check_user_id: user.id,
      });

      if (error) {
        this.logger.error('Error checking admin status', 'AdminService', error);
        return false;
      }

      return data === true;
    } catch (error) {
      this.logger.error('Error checking admin status', 'AdminService', error as Error);
      return false;
    }
  }

  /**
   * Check if current user has specific admin role
   */
  async hasRole(role: AdminRole): Promise<boolean> {
    try {
      const roles = await this.getAdminRoles();
      return roles.includes(role);
    } catch (error) {
      this.logger.error(`Error checking role ${role}`, 'AdminService', error as Error);
      return false;
    }
  }

  /**
   * Check if current user has specific permission
   */
  async hasPermission(permission: AdminPermission): Promise<boolean> {
    try {
      const roles = await this.getAdminRoles();

      // Check if any of user's roles has this permission
      return roles.some((role) => PERMISSIONS_MATRIX[role]?.includes(permission));
    } catch (error) {
      this.logger.error(`Error checking permission ${permission}`, 'AdminService', error as Error);
      return false;
    }
  }

  /**
   * Get all admin roles for current user
   */
  async getAdminRoles(): Promise<AdminRole[]> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) return [];

      // Use cache if available for same user
      if (this.rolesCache && this.rolesCacheUserId === user.id) {
        return this.rolesCache;
      }

      const { data, error } = await this.supabase.rpc('get_admin_roles', {
        check_user_id: user.id,
      });

      if (error) {
        this.logger.error('Error fetching admin roles', 'AdminService', error);
        return [];
      }

      // Update cache
      this.rolesCache = (data as AdminRole[]) ?? [];
      this.rolesCacheUserId = user.id;

      return this.rolesCache;
    } catch (error) {
      this.logger.error('Error fetching admin roles', 'AdminService', error as Error);
      return [];
    }
  }

  /**
   * Get all permissions for current user (union of all role permissions)
   */
  async getPermissions(): Promise<AdminPermission[]> {
    const roles = await this.getAdminRoles();
    const permissions = new Set<AdminPermission>();

    roles.forEach((role) => {
      PERMISSIONS_MATRIX[role]?.forEach((perm) => permissions.add(perm));
    });

    return Array.from(permissions);
  }

  /**
   * Clear roles cache (call on auth state change)
   */
  clearCache(): void {
    this.rolesCache = null;
    this.rolesCacheUserId = null;
  }

  // ============================================================================
  // AUDIT LOGGING
  // ============================================================================

  /**
   * Log an admin action to audit trail
   */
  async logAction(context: AdminActionContext): Promise<string | null> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) {
        this.logger.warn('Attempted to log action without authenticated user', 'AdminService');
        return null;
      }

      const { data, error } = await this.supabase.rpc('log_admin_action', {
        p_action: context.action,
        p_resource_type: context.resourceType,
        p_resource_id: context.resourceId ?? null,
        p_details: context.details ?? null,
        p_ip_address: context.ipAddress ?? null,
        p_user_agent: context.userAgent ?? null,
      });

      if (error) {
        this.logger.error('Error logging admin action', 'AdminService', error);
        return null;
      }

      return data as string;
    } catch (error) {
      this.logger.error('Error logging admin action', 'AdminService', error as Error);
      return null;
    }
  }

  /**
   * Get audit log entries (super admin only)
   */
  async getAuditLog(filters?: {
    adminUserId?: string;
    action?: string;
    resourceType?: string;
    limit?: number;
    offset?: number;
  }): Promise<AdminAuditLog[]> {
    try {
      // Check permission
      const hasPermission = await this.hasPermission('view_audit_log');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to view audit log');
      }

      let query = this.supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters?.limit ?? 100);

      if (filters?.adminUserId) {
        query = query.eq('admin_user_id', filters.adminUserId);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.resourceType) {
        query = query.eq('resource_type', filters.resourceType);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit ?? 100) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data ?? []) as AdminAuditLog[];
    } catch (error) {
      this.logger.error('Error fetching audit log', 'AdminService', error as Error);
      throw error;
    }
  }

  // ============================================================================
  // ADMIN USER MANAGEMENT
  // ============================================================================

  /**
   * Grant admin role to user (super admin only)
   */
  async grantAdminRole(userId: string, role: AdminRole, notes?: string): Promise<AdminUser | null> {
    try {
      // Check permission
      const hasPermission = await this.hasPermission('grant_admin_roles');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to grant admin roles');
      }

      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const adminUser: AdminUserInsert = {
        user_id: userId,
        role,
        granted_by: user.id,
        notes: notes ?? null,
      };

      const { data, error } = await this.supabase
        .from('admin_users')
        .insert(adminUser)
        .select()
        .single();

      if (error) throw error;

      // Log action
      await this.logAction({
        action: 'grant_admin_role',
        resourceType: 'admin_user',
        resourceId: data.id,
        details: { userId, role, notes },
      });

      return data as AdminUser;
    } catch (error) {
      this.logger.error('Error granting admin role', 'AdminService', error as Error);
      throw error;
    }
  }

  /**
   * Revoke admin role from user (super admin only)
   */
  async revokeAdminRole(adminUserId: string, reason?: string): Promise<void> {
    try {
      // Check permission
      const hasPermission = await this.hasPermission('revoke_admin_roles');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to revoke admin roles');
      }

      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const update: AdminUserUpdate = {
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
        notes: reason ?? null,
      };

      const { error } = await this.supabase
        .from('admin_users')
        .update(update)
        .eq('id', adminUserId)
        .is('revoked_at', null); // Only revoke active roles

      if (error) throw error;

      // Log action
      await this.logAction({
        action: 'revoke_admin_role',
        resourceType: 'admin_user',
        resourceId: adminUserId,
        details: { reason },
      });
    } catch (error) {
      this.logger.error('Error revoking admin role', 'AdminService', error as Error);
      throw error;
    }
  }

  /**
   * List all admin users (super admin only)
   */
  async listAdminUsers(includeRevoked = false): Promise<AdminUserWithProfile[]> {
    try {
      // Check permission
      const hasPermission = await this.hasPermission('manage_admins');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to view admin users');
      }

      let query = this.supabase
        .from('admin_users')
        .select(
          `
          *,
          profile:profiles!admin_users_user_id_fkey(full_name, email, avatar_url),
          granted_by_profile:profiles!admin_users_granted_by_fkey(full_name, email)
        `,
        )
        .order('created_at', { ascending: false });

      if (!includeRevoked) {
        query = query.is('revoked_at', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data ?? []) as AdminUserWithProfile[];
    } catch (error) {
      this.logger.error('Error listing admin users', 'AdminService', error as Error);
      throw error;
    }
  }

  // ============================================================================
  // EXISTING ADMIN OPERATIONS (with audit logging added)
  // ============================================================================

  /**
   * Approve a car listing
   */
  async approveCar(carId: string): Promise<void> {
    // Check permission
    const hasPermission = await this.hasPermission('approve_cars');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to approve cars');
    }

    const { error } = await this.supabase.from('cars').update({ status: 'active' }).eq('id', carId);

    if (error) throw error;

    // Log action
    await this.logAction({
      action: 'approve_car',
      resourceType: 'car',
      resourceId: carId,
    });
  }

  /**
   * List pending car approvals
   */
  async listPendingCars(): Promise<Car[]> {
    // Check permission
    const hasPermission = await this.hasPermission('view_cars');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to view cars');
    }

    const { data, error } = await this.supabase
      .from('cars')
      .select('*, car_photos(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Car[];
  }

  /**
   * List recent bookings
   */
  async listRecentBookings(limit = 20): Promise<Booking[]> {
    // Check permission
    const hasPermission = await this.hasPermission('view_bookings');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to view bookings');
    }

    const { data, error } = await this.supabase
      .from('bookings')
      .select('*, cars(*), profiles(*)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as Booking[];
  }

  /**
   * Approve withdrawal request
   */
  async approveWithdrawal(requestId: string, adminNotes?: string): Promise<void> {
    // Check permission
    const hasPermission = await this.hasPermission('process_refunds');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to approve withdrawals');
    }

    const { error } = await this.supabase.rpc('wallet_approve_withdrawal', {
      p_request_id: requestId,
      p_admin_notes: adminNotes,
    });

    if (error) throw error;

    // Log action
    await this.logAction({
      action: 'approve_withdrawal',
      resourceType: 'withdrawal_request',
      resourceId: requestId,
      details: { adminNotes },
    });
  }

  /**
   * Complete withdrawal request
   */
  async completeWithdrawal(
    requestId: string,
    providerTransactionId: string,
    providerMetadata?: Record<string, unknown>,
  ): Promise<void> {
    // Check permission
    const hasPermission = await this.hasPermission('process_refunds');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to complete withdrawals');
    }

    const { error } = await this.supabase.rpc('wallet_complete_withdrawal', {
      p_request_id: requestId,
      p_provider_transaction_id: providerTransactionId,
      p_provider_metadata: providerMetadata,
    });

    if (error) throw error;

    // Log action
    await this.logAction({
      action: 'complete_withdrawal',
      resourceType: 'withdrawal_request',
      resourceId: requestId,
      details: { providerTransactionId, providerMetadata },
    });
  }

  /**
   * Fail withdrawal request
   */
  async failWithdrawal(requestId: string, failureReason: string): Promise<void> {
    // Check permission
    const hasPermission = await this.hasPermission('process_refunds');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to fail withdrawals');
    }

    const { error } = await this.supabase.rpc('wallet_fail_withdrawal', {
      p_request_id: requestId,
      p_failure_reason: failureReason,
    });

    if (error) throw error;

    // Log action
    await this.logAction({
      action: 'fail_withdrawal',
      resourceType: 'withdrawal_request',
      resourceId: requestId,
      details: { failureReason },
    });
  }

  /**
   * Reject withdrawal request
   */
  async rejectWithdrawal(requestId: string, rejectionReason: string): Promise<void> {
    // Check permission
    const hasPermission = await this.hasPermission('process_refunds');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to reject withdrawals');
    }

    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

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

    // Log action
    await this.logAction({
      action: 'reject_withdrawal',
      resourceType: 'withdrawal_request',
      resourceId: requestId,
      details: { rejectionReason },
    });
  }

  /**
   * List withdrawal requests with optional status filter
   */
  async listWithdrawalRequests(status?: string): Promise<WithdrawalRequest[]> {
    // Check permission
    const hasPermission = await this.hasPermission('view_payments');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to view withdrawal requests');
    }

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

    return (data ?? []).map((item) => {
      const typedItem = item as unknown as WithdrawalRequest & {
        user?: { full_name?: string | null; email?: Array<{ email: string }> };
      };
      const { user, ...rest } = typedItem;
      return {
        ...rest,
        user_name: user?.full_name ?? undefined,
        user_email: user?.email?.[0]?.email ?? undefined,
        bank_account: typedItem.bank_account,
      } as WithdrawalRequest;
    });
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
  async flagVerificationSuspicious(
    userId: string,
    notes: string,
  ): Promise<AdminVerificationResponse> {
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
    const typedData = data as unknown as Record<string, unknown>;
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
    // Matches UUID v4 format: 8-4-4-4-12 hexadecimal characters with hyphens
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

  // ============================================================================
  // RPC INTEGRATIONS - Account Suspension & Debt Management
  // ============================================================================

  /**
   * Obtiene usuarios con deuda (balance negativo)
   * Para el panel de administración de suspensiones
   */
  async getUsersWithDebt(options?: {
    minDays?: number;
    limit?: number;
    offset?: number;
  }): Promise<{
    users: Array<{
      userId: string;
      fullName: string;
      email: string;
      balanceCents: number;
      debtStartDate: string;
      daysSinceDebt: number;
      isSuspended: boolean;
      suspendedAt: string | null;
      suspensionReason: string | null;
    }>;
    total: number;
  }> {
    try {
      // Check permission
      const hasPermission = await this.hasPermission('view_users');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to view users with debt');
      }

      const { data, error } = await this.supabase.rpc('get_users_with_debt', {
        p_min_days: options?.minDays ?? 0,
        p_limit: options?.limit ?? 50,
        p_offset: options?.offset ?? 0,
      });

      if (error) throw error;

      return {
        users: (data?.users ?? []).map((u: Record<string, unknown>) => ({
          userId: u.user_id as string,
          fullName: u.full_name as string,
          email: u.email as string,
          balanceCents: u.balance_cents as number,
          debtStartDate: u.debt_start_date as string,
          daysSinceDebt: u.days_since_debt as number,
          isSuspended: u.is_suspended as boolean,
          suspendedAt: u.suspended_at as string | null,
          suspensionReason: u.suspension_reason as string | null,
        })),
        total: data?.total ?? 0,
      };
    } catch (error) {
      this.logger.error('Error fetching users with debt', 'AdminService', error as Error);
      throw error;
    }
  }

  /**
   * Suspende manualmente una cuenta por deuda
   */
  async suspendAccountForDebt(
    userId: string,
    reason: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const hasPermission = await this.hasPermission('suspend_users');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to suspend users');
      }

      const { error } = await this.supabase.rpc('suspend_account_manual', {
        p_user_id: userId,
        p_reason: reason,
      });

      if (error) throw error;

      // Log action
      await this.logAction({
        action: 'suspend_account',
        resourceType: 'user',
        resourceId: userId,
        details: { reason },
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al suspender cuenta',
      };
    }
  }

  /**
   * Reactiva una cuenta suspendida (después de pagar deuda)
   */
  async unsuspendAccount(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const hasPermission = await this.hasPermission('suspend_users');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to unsuspend users');
      }

      const { error } = await this.supabase.rpc('unsuspend_account', {
        p_user_id: userId,
      });

      if (error) throw error;

      // Log action
      await this.logAction({
        action: 'unsuspend_account',
        resourceType: 'user',
        resourceId: userId,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al reactivar cuenta',
      };
    }
  }

  /**
   * Verifica si un usuario puede operar (no está suspendido)
   */
  async canUserOperate(userId?: string): Promise<{
    canOperate: boolean;
    reason?: string;
    suspendedAt?: string;
  }> {
    try {
      const { data, error } = await this.supabase.rpc('can_user_operate', {
        p_user_id: userId || null,
      });

      if (error) throw error;

      return {
        canOperate: data?.can_operate ?? true,
        reason: data?.reason,
        suspendedAt: data?.suspended_at,
      };
    } catch {
      return { canOperate: true }; // Default to allowing operation on error
    }
  }
}
