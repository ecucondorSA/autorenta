/**
 * AdminGuard - Role-Based Access Control for Admin Routes
 * Created: 2025-11-07
 * Issue: #123 - Admin Authentication & Role-Based Access Control
 *
 * Protects routes that require admin permissions with role-based access control.
 *
 * Basic usage (any admin role):
 * ```typescript
 * {
 *   path: 'admin',
 *   canMatch: [AdminGuard],
 *   loadChildren: () => import('./admin/admin.routes')
 * }
 * ```
 *
 * Role-specific usage:
 * ```typescript
 * {
 *   path: 'admin/audit-log',
 *   canMatch: [AdminGuard],
 *   data: { requiredRole: 'super_admin' }, // Only super admins
 *   loadChildren: () => import('./admin/audit-log/audit-log.routes')
 * }
 * ```
 *
 * Permission-specific usage:
 * ```typescript
 * {
 *   path: 'admin/verifications',
 *   canMatch: [AdminGuard],
 *   data: { requiredPermission: 'approve_verifications' },
 *   loadChildren: () => import('./admin/verifications/verifications.routes')
 * }
 * ```
 */

import { inject } from '@angular/core';
import { CanMatchFn, Router, Route } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../services/logger.service';
import type { AdminRole, AdminPermission } from '../types/admin.types';

/**
 * AdminGuard - Protects admin routes with RBAC
 *
 * Supports three modes via route data:
 * 1. No data: User must be any admin
 * 2. data.requiredRole: User must have specific role
 * 3. data.requiredPermission: User must have specific permission
 */
export const AdminGuard: CanMatchFn = async (route: Route) => {
  const auth = inject(AuthService);
  const adminService = inject(AdminService);
  const router = inject(Router);
  const logger = inject(LoggerService);

  try {
    // 1. Verify authentication first
    const session = await auth.ensureSession();

    if (!session?.user) {
      logger.warn('AdminGuard: User not authenticated', 'AdminGuard');
      return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: route.path },
      });
    }

    // 2. Check if user is admin at all
    const isAdmin = await adminService.isAdmin();

    if (!isAdmin) {
      logger.warn(
        `AdminGuard: User ${session.user.id} attempted to access admin route without admin role`,
        'AdminGuard',
      );
      return router.createUrlTree(['/']);
    }

    // 3. Check role-specific or permission-specific requirements
    const requiredRole = route.data?.['requiredRole'] as AdminRole | undefined;
    const requiredPermission = route.data?.['requiredPermission'] as AdminPermission | undefined;

    // If specific role is required
    if (requiredRole) {
      const hasRole = await adminService.hasRole(requiredRole);

      if (!hasRole) {
        logger.warn(
          `AdminGuard: User ${session.user.id} attempted to access route requiring role '${requiredRole}'`,
          'AdminGuard',
        );
        return router.createUrlTree(['/admin'], {
          queryParams: { error: 'insufficient_permissions' },
        });
      }
    }

    // If specific permission is required
    if (requiredPermission) {
      const hasPermission = await adminService.hasPermission(requiredPermission);

      if (!hasPermission) {
        logger.warn(
          `AdminGuard: User ${session.user.id} attempted to access route requiring permission '${requiredPermission}'`,
          'AdminGuard',
        );
        return router.createUrlTree(['/admin'], {
          queryParams: { error: 'insufficient_permissions' },
        });
      }
    }

    // All checks passed
    logger.info(
      `AdminGuard: User ${session.user.id} granted access to ${route.path}`,
      'AdminGuard',
    );
    return true;
  } catch (error) {
    logger.error(
      'AdminGuard: Error verifying admin permissions',
      'AdminGuard',
      error instanceof Error ? error : new Error(String(error)),
    );

    return router.createUrlTree(['/']);
  }
};

/**
 * Helper function to create admin guards with specific requirements
 *
 * Example:
 * ```typescript
 * const SuperAdminGuard = createAdminGuard('super_admin');
 * const OperationsGuard = createAdminGuard(null, 'approve_verifications');
 * ```
 */
export function createAdminGuard(
  requiredRole?: AdminRole,
  requiredPermission?: AdminPermission,
): CanMatchFn {
  return (route: Route, segments: import('@angular/router').UrlSegment[]) => {
    // Override route data with specified requirements
    const modifiedRoute = {
      ...route,
      data: {
        ...route.data,
        ...(requiredRole && { requiredRole }),
        ...(requiredPermission && { requiredPermission }),
      },
    };

    return AdminGuard(modifiedRoute, segments);
  };
}

// ============================================================================
// COMMON GUARD PRESETS
// ============================================================================

/**
 * SuperAdminGuard - Only super admins can access
 */
export const SuperAdminGuard: CanMatchFn = createAdminGuard('super_admin');

/**
 * OperationsGuard - Only operations or super admins can access
 */
export const OperationsGuard: CanMatchFn = createAdminGuard('operations');

/**
 * SupportGuard - Only support or super admins can access
 */
export const SupportGuard: CanMatchFn = createAdminGuard('support');

/**
 * FinanceGuard - Only finance or super admins can access
 */
export const FinanceGuard: CanMatchFn = createAdminGuard('finance');
