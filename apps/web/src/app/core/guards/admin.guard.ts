import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';
import { RBACService } from '../services/rbac.service';
import { LoggerService } from '../services/logger.service';
import type { AdminRoleType } from '../models';

/**
 * AdminGuard - Protege rutas que requieren permisos de administrador
 *
 * Verifica que el usuario esté autenticado Y que tenga permisos de admin
 * (via RBAC roles o legacy is_admin flag)
 *
 * Uso:
 * ```typescript
 * {
 *   path: 'admin/accounting',
 *   canMatch: [AuthGuard, AdminGuard],
 *   loadChildren: () => import('./accounting/accounting.routes')
 * }
 * ```
 */
export const AdminGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const profileService = inject(ProfileService);
  const rbac = inject(RBACService);
  const router = inject(Router);
  const logger = inject(LoggerService);

  try {
    // Verificar autenticación primero
    const session = await auth.ensureSession();

    if (!session?.user) {
      logger.warn('AdminGuard: Usuario no autenticado', 'AdminGuard');
      return router.createUrlTree(['/auth/login']);
    }

    // Check RBAC first (new system)
    const isAdmin = await rbac.checkIsAdmin();

    if (isAdmin) {
      // Load roles into cache for later use
      await rbac.loadUserRoles();
      return true;
    }

    // Fallback to legacy is_admin check
    const profile = await profileService.getCurrentProfile();

    if (!profile) {
      logger.error('AdminGuard: No se pudo cargar perfil del usuario', 'AdminGuard');
      return router.createUrlTree(['/']);
    }

    if (profile.is_admin) {
      return true;
    }

    // No es admin - rechazar acceso
    logger.warn(
      `AdminGuard: Usuario ${profile.id} (${profile.full_name}) intentó acceder a ruta admin sin permisos`,
      'AdminGuard',
    );

    return router.createUrlTree(['/']);
  } catch (error) {
    logger.error(
      'AdminGuard: Error verificando permisos de admin',
      'AdminGuard',
      error instanceof Error ? error : new Error(String(error)),
    );

    return router.createUrlTree(['/']);
  }
};

/**
 * RoleGuard Factory - Crea un guard que verifica un rol específico
 *
 * @param roles - Rol(es) requerido(s)
 *
 * @example
 * ```typescript
 * {
 *   path: 'admin/users',
 *   canMatch: [AuthGuard, AdminGuard, RoleGuard(['super_admin', 'support'])],
 *   loadComponent: () => import('./users.page')
 * }
 * ```
 */
export function RoleGuard(roles: AdminRoleType | AdminRoleType[]): CanMatchFn {
  return async () => {
    const rbac = inject(RBACService);
    const router = inject(Router);
    const logger = inject(LoggerService);

    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    try {
      // Check if user has any of the required roles
      const hasRole = await rbac.hasAnyRole(requiredRoles);

      if (hasRole) {
        return true;
      }

      // Check if user is super_admin (has access to everything)
      if (await rbac.hasRole('super_admin')) {
        return true;
      }

      logger.warn(`RoleGuard: Usuario no tiene los roles requeridos: ${requiredRoles.join(', ')}`);
      return router.createUrlTree(['/admin']);
    } catch (error) {
      logger.error(
        'RoleGuard: Error verificando roles',
        'RoleGuard',
        error instanceof Error ? error : new Error(String(error)),
      );
      return router.createUrlTree(['/admin']);
    }
  };
}
