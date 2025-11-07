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
import { injectSupabase } from './supabase-client.service';
import { LoggerService } from './logger.service';
import type {
  AdminRole,
  AdminUser,
  AdminUserInsert,
  AdminUserUpdate,
  AdminAuditLog,
  AdminAuditLogInsert,
  AdminPermission,
  AdminActionContext,
  AdminUserWithProfile,
  ADMIN_PERMISSIONS,
} from '../types/admin.types';

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
  async grantAdminRole(
    userId: string,
    role: AdminRole,
    notes?: string,
  ): Promise<AdminUser | null> {
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
  async listPendingCars(): Promise<unknown[]> {
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
    return data ?? [];
  }

  /**
   * List recent bookings
   */
  async listRecentBookings(limit = 20): Promise<unknown[]> {
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
    return data ?? [];
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
  async listWithdrawalRequests(status?: string): Promise<unknown[]> {
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
      const typedItem = item as Record<string, unknown>;
      return {
        ...typedItem,
        user_name: (typedItem.user as Record<string, unknown>)?.full_name,
        user_email: (
          (typedItem.user as Record<string, unknown>)?.email as Array<{ email: string }>
        )?.[0]?.email,
      };
    });
  }
}
