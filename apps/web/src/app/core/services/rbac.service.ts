import { Injectable, inject, signal, computed } from '@angular/core';
import { injectSupabase } from './supabase-client.service';
import { AuthService } from './auth.service';
import type { AdminAuditLog } from '../models';
import type { AdminRole, AdminUser, AdminAuditLog as AdminAuditLogType } from '../types/admin.types';

/**
 * RBAC Service - Role-Based Access Control
 *
 * Manages admin roles, permissions, and audit logging for admin operations.
 * Supports both new RBAC system and legacy is_admin flag for backward compatibility.
 *
 * @example
 * ```typescript
 * const rbac = inject(RBACService);
 *
 * // Check if user has a specific role
 * if (await rbac.hasRole('super_admin')) {
 *   // Allow access
 * }
 *
 * // Check if user has any admin role
 * if (await rbac.isAdmin()) {
 *   // Allow access
 * }
 *
 * // Log an admin action
 * await rbac.logAction('user_view', 'user', userId, null, { reason: 'Support ticket' });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class RBACService {
  private readonly supabase = injectSupabase();
  private readonly authService = inject(AuthService);

  // Cached user roles
  private readonly userRolesSignal = signal<AdminUser[]>([]);
  private readonly loadingSignal = signal<boolean>(false);

  // Computed properties
  readonly userRoles = computed(() => this.userRolesSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly isAdmin = computed(() => this.userRolesSignal().length > 0);
  readonly isSuperAdmin = computed(() =>
    this.userRolesSignal().some((r) => r.role === 'super_admin'),
  );
  readonly isOperations = computed(() =>
    this.userRolesSignal().some((r) => r.role === 'operations'),
  );
  readonly isSupport = computed(() => this.userRolesSignal().some((r) => r.role === 'support'));
  readonly isFinance = computed(() => this.userRolesSignal().some((r) => r.role === 'finance'));

  /**
   * Load current user's admin roles
   */
  async loadUserRoles(): Promise<AdminUser[]> {
    this.loadingSignal.set(true);
    try {
      const user = await this.authService.ensureSession();
      if (!user?.user?.id) {
        this.userRolesSignal.set([]);
        return [];
      }

      const { data, error } = await this.supabase
        .from('admin_user_roles')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      if (error) throw error;

      this.userRolesSignal.set(data as AdminUser[]);
      return data as AdminUser[];
    } catch (error) {
      console.error('Error loading user roles:', error);
      this.userRolesSignal.set([]);
      return [];
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Check if current user has a specific admin role
   */
  async hasRole(role: AdminRole): Promise<boolean> {
    const roles = this.userRolesSignal();
    if (roles.length === 0) {
      await this.loadUserRoles();
    }

    return this.userRolesSignal().some((r) => r.role === role);
  }

  /**
   * Check if current user has any of the specified roles
   */
  async hasAnyRole(roles: AdminRole[]): Promise<boolean> {
    const userRoles = this.userRolesSignal();
    if (userRoles.length === 0) {
      await this.loadUserRoles();
    }

    return this.userRolesSignal().some((r) => roles.includes(r.role));
  }

  /**
   * Check if current user has all of the specified roles
   */
  async hasAllRoles(roles: AdminRole[]): Promise<boolean> {
    const userRoles = this.userRolesSignal();
    if (userRoles.length === 0) {
      await this.loadUserRoles();
    }

    return roles.every((role) => this.userRolesSignal().some((r) => r.role === role));
  }

  /**
   * Check if current user is any type of admin (new RBAC or legacy)
   */
  async checkIsAdmin(): Promise<boolean> {
    // Check new RBAC first
    const roles = this.userRolesSignal();
    if (roles.length === 0) {
      await this.loadUserRoles();
    }

    if (this.userRolesSignal().length > 0) {
      return true;
    }

    // Fallback to legacy is_admin check
    try {
      const { data } = await this.supabase.rpc('is_admin');
      return data === true;
    } catch {
      return false;
    }
  }

  /**
   * Log an admin action to the audit trail
   */
  async logAction(
    action: string,
    resourceType: string,
    resourceId: string | null = null,
    changes: { before?: unknown; after?: unknown } | null = null,
    metadata: Record<string, unknown> | null = null,
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.rpc('log_admin_action', {
        p_action: action,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_changes: changes as never,
        p_metadata: metadata as never,
      });

      if (error) {
        console.error('Error logging admin action:', error);
        return null;
      }

      return data as string;
    } catch (error) {
      console.error('Error logging admin action:', error);
      return null;
    }
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(params: {
    limit?: number;
    offset?: number;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    adminUserId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: AdminAuditLog[]; count: number }> {
    try {
      let query = this.supabase
        .from('admin_audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (params.action) {
        query = query.eq('action', params.action);
      }

      if (params.resourceType) {
        query = query.eq('resource_type', params.resourceType);
      }

      if (params.resourceId) {
        query = query.eq('resource_id', params.resourceId);
      }

      if (params.adminUserId) {
        query = query.eq('admin_user_id', params.adminUserId);
      }

      if (params.startDate) {
        query = query.gte('created_at', params.startDate);
      }

      if (params.endDate) {
        query = query.lte('created_at', params.endDate);
      }

      if (params.limit) {
        query = query.limit(params.limit);
      }

      if (params.offset) {
        query = query.range(params.offset, params.offset + (params.limit ?? 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: (data as AdminAuditLog[]) ?? [],
        count: count ?? 0,
      };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return { data: [], count: 0 };
    }
  }

  /**
   * Grant an admin role to a user (super_admin only)
   */
  async grantRole(
    userId: string,
    role: AdminRole,
    expiresAt: string | null = null,
  ): Promise<boolean> {
    if (!(await this.hasRole('super_admin'))) {
      throw new Error('Only super admins can grant roles');
    }

    try {
      const user = await this.authService.ensureSession();
      if (!user?.user?.id) {
        throw new Error('Not authenticated');
      }

      const { error } = await this.supabase.from('admin_user_roles').insert({
        user_id: userId,
        role,
        granted_by: user.user.id,
        expires_at: expiresAt,
        is_active: true,
      });

      if (error) throw error;

      // Log the action
      await this.logAction('role_grant', 'admin_user_role', userId, null, {
        role,
        expires_at: expiresAt,
      });

      return true;
    } catch (error) {
      console.error('Error granting role:', error);
      return false;
    }
  }

  /**
   * Revoke an admin role from a user (super_admin only)
   */
  async revokeRole(userId: string, role: AdminRole): Promise<boolean> {
    if (!(await this.hasRole('super_admin'))) {
      throw new Error('Only super admins can revoke roles');
    }

    try {
      const { error } = await this.supabase
        .from('admin_user_roles')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      // Log the action
      await this.logAction('role_revoke', 'admin_user_role', userId, null, { role });

      return true;
    } catch (error) {
      console.error('Error revoking role:', error);
      return false;
    }
  }

  /**
   * Get role display name
   */
  getRoleDisplayName(role: AdminRole): string {
    const roleNames: Record<AdminRole, string> = {
      super_admin: 'Super Administrator',
      operations: 'Operations Manager',
      support: 'Support Specialist',
      finance: 'Finance Manager',
    };
    return roleNames[role];
  }

  /**
   * Get role description
   */
  getRoleDescription(role: AdminRole): string {
    const roleDescriptions: Record<AdminRole, string> = {
      super_admin:
        'Full access to all admin features including user management and system configuration',
      operations: 'Manage withdrawals, verifications, bookings, and operational tasks',
      support: 'User support, content moderation, and customer service',
      finance: 'Payment investigation, refunds, accounting, and financial operations',
    };
    return roleDescriptions[role];
  }

  /**
   * Get role permissions
   */
  getRolePermissions(role: AdminRole): string[] {
    const rolePermissions: Record<AdminRole, string[]> = {
      super_admin: ['*'],
      operations: ['withdrawals:*', 'verifications:*', 'bookings:*', 'cars:*'],
      support: ['users:view', 'bookings:view', 'reviews:moderate', 'support:*'],
      finance: ['payments:*', 'refunds:*', 'accounting:*', 'reports:*'],
    };
    return rolePermissions[role];
  }
}
