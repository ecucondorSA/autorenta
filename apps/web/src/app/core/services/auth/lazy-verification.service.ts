import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IdentityLevelService } from '@core/services/verification/identity-level.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { ProfileService } from './profile.service';

export type VerificationContext = 'booking' | 'publish' | 'payout' | 'message';

interface VerificationRequirement {
  phone?: boolean;
  email?: boolean;
  documents?: boolean;
  mercadopago?: boolean;
}

const CONTEXT_REQUIREMENTS: Record<VerificationContext, VerificationRequirement> = {
  booking: { phone: true, email: true },
  publish: { phone: true, email: true, mercadopago: true },
  payout: { phone: true, email: true, documents: true, mercadopago: true },
  message: { email: true },
};

/**
 * LazyVerificationService - Verificación "Just in Time"
 *
 * En lugar de bloquear el registro con múltiples pasos,
 * este servicio pide verificación SOLO cuando es necesaria.
 *
 * Ejemplo:
 * - Usuario explora autos sin verificar ✓
 * - Usuario quiere reservar → "Necesitamos tu teléfono para confirmar"
 * - Usuario quiere publicar → "Vinculá MercadoPago para recibir pagos"
 */
@Injectable({ providedIn: 'root' })
export class LazyVerificationService {
  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);
  private readonly identityService = inject(IdentityLevelService);
  private readonly logger = inject(LoggerService);

  // Estado de verificación pendiente
  readonly pendingContext = signal<VerificationContext | null>(null);
  readonly pendingReturnUrl = signal<string | null>(null);

  /**
   * Verifica si el usuario puede realizar una acción.
   * Si no puede, guarda el contexto y redirige a verificación.
   *
   * @returns true si puede continuar, false si necesita verificar
   */
  async canProceed(context: VerificationContext, returnUrl?: string): Promise<boolean> {
    const requirements = CONTEXT_REQUIREMENTS[context];
    const missingSteps: string[] = [];

    try {
      const profile = await this.profileService.getMe();

      // Verificar email
      if (requirements.email && !profile.email_verified) {
        missingSteps.push('email');
      }

      // Verificar teléfono
      if (requirements.phone && !profile.phone_verified) {
        missingSteps.push('phone');
      }

      // Verificar documentos (Level 2)
      if (requirements.documents) {
        const levelCheck = await this.identityService.checkLevelAccess(2);
        if (!levelCheck.allowed) {
          missingSteps.push('documents');
        }
      }

      // Verificar MercadoPago
      if (requirements.mercadopago && !profile.mercadopago_connected) {
        missingSteps.push('mercadopago');
      }

      // Si no faltan pasos, permitir
      if (missingSteps.length === 0) {
        this.logger.debug(`LazyVerification: ${context} - all requirements met`, 'LazyVerification');
        return true;
      }

      // Guardar contexto para después de verificar
      this.pendingContext.set(context);
      this.pendingReturnUrl.set(returnUrl || this.router.url);

      this.logger.info(`LazyVerification: ${context} - missing: ${missingSteps.join(', ')}`, 'LazyVerification');

      // Redirigir a verificación con contexto
      await this.router.navigate(['/profile/verification'], {
        queryParams: {
          context,
          missing: missingSteps.join(','),
          returnUrl: returnUrl || this.router.url,
        },
      });

      return false;
    } catch (error) {
      this.logger.error('LazyVerification error', 'LazyVerification', { error });
      // Fail-open: permitir si hay error (el backend validará)
      return true;
    }
  }

  /**
   * Obtiene un mensaje amigable para el usuario según el contexto
   */
  getContextMessage(context: VerificationContext): string {
    const messages: Record<VerificationContext, string> = {
      booking: 'Para reservar, necesitamos verificar tu contacto',
      publish: 'Para publicar tu auto, vinculá tu cuenta de MercadoPago',
      payout: 'Para recibir pagos, completá tu verificación de identidad',
      message: 'Para enviar mensajes, verificá tu email',
    };
    return messages[context];
  }

  /**
   * Obtiene los pasos faltantes para un contexto
   */
  async getMissingSteps(context: VerificationContext): Promise<string[]> {
    const requirements = CONTEXT_REQUIREMENTS[context];
    const missing: string[] = [];

    try {
      const profile = await this.profileService.getMe();

      if (requirements.email && !profile.email_verified) missing.push('email');
      if (requirements.phone && !profile.phone_verified) missing.push('phone');
      if (requirements.mercadopago && !profile.mercadopago_connected) missing.push('mercadopago');

      if (requirements.documents) {
        const levelCheck = await this.identityService.checkLevelAccess(2);
        if (!levelCheck.allowed) missing.push('documents');
      }

      return missing;
    } catch {
      return [];
    }
  }

  /**
   * Completa la verificación pendiente y navega de vuelta
   */
  async completePendingVerification(): Promise<void> {
    const returnUrl = this.pendingReturnUrl();
    this.pendingContext.set(null);
    this.pendingReturnUrl.set(null);

    if (returnUrl) {
      await this.router.navigateByUrl(returnUrl);
    }
  }

  /**
   * Infiere el rol del usuario basado en su comportamiento
   * y lo guarda en el perfil si no está definido
   */
  async inferRole(action: 'search' | 'publish'): Promise<void> {
    try {
      const profile = await this.profileService.getMe();

      // Si ya tiene rol definido, no hacer nada
      if (profile.role && profile.role !== 'both') {
        return;
      }

      const inferredRole = action === 'publish' ? 'owner' : 'renter';

      // Solo actualizar si no tiene rol o es "both" (podemos ser más específicos)
      if (!profile.role) {
        await this.profileService.updateProfile({ role: inferredRole });
        this.logger.info(`Role inferred: ${inferredRole} from action: ${action}`, 'LazyVerification');
      }
    } catch (error) {
      this.logger.warn('Could not infer role', 'LazyVerification', { error });
    }
  }
}
