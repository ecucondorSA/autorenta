import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';
import { LoggerService } from '../services/logger.service';

/**
 * AdminGuard - Protege rutas que requieren permisos de administrador
 *
 * Verifica que el usuario esté autenticado Y que tenga is_admin = true
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
  const router = inject(Router);
  const logger = inject(LoggerService);

  try {
    // Verificar autenticación primero
    const session = await auth.ensureSession();

    if (!session?.user) {
      logger.warn('AdminGuard: Usuario no autenticado', 'AdminGuard');
      return router.createUrlTree(['/auth/login']);
    }

    // Obtener perfil completo para verificar is_admin
    const profile = await profileService.getCurrentProfile();

    if (!profile) {
      logger.error('AdminGuard: No se pudo cargar perfil del usuario', 'AdminGuard');
      return router.createUrlTree(['/']);
    }

    // Verificar si es admin
    if (profile.is_admin) {
      return true;
    }

    // No es admin - rechazar acceso
    logger.warn(
      `AdminGuard: Usuario ${profile.id} (${profile.full_name}) intentó acceder a ruta admin sin permisos`,
      'AdminGuard'
    );

    return router.createUrlTree(['/']);
  } catch (error) {
    logger.error(
      'AdminGuard: Error verificando permisos de admin',
      'AdminGuard',
      error instanceof Error ? error : new Error(String(error))
    );

    return router.createUrlTree(['/']);
  }
};
