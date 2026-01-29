import { LoggerService } from '@core/services/infrastructure/logger.service';
import { Injectable, inject, OnDestroy } from '@angular/core';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { VerificationStateService } from '@core/services/verification/verification-state.service';

/**
 * Service to handle verification event notifications
 *
 * Listens to verification events from VerificationStateService
 * and shows toast notifications to the user
 */
@Injectable({
  providedIn: 'root',
})
export class VerificationNotificationsService implements OnDestroy {
  private readonly logger = inject(LoggerService);
  private readonly toast = inject(NotificationManagerService);
  private readonly verificationStateService = inject(VerificationStateService);

  private unsubscribe?: () => void;

  /**
   * Initialize notification listeners
   * Call this once when app starts
   */
  initialize(): void {
    this.unsubscribe = this.verificationStateService.addEventListener((event) => {
      this.handleVerificationEvent(event.detail.type);
    });

    this.logger.debug('[VerificationNotifications] Initialized');
  }

  /**
   * Handle verification events and show appropriate notifications
   */
  private handleVerificationEvent(eventType: string): void {
    switch (eventType) {
      case 'email_verified':
        this.toast.success(
          '¡Email Verificado!',
          'Tu correo electrónico ha sido verificado exitosamente.',
        );
        break;

      case 'phone_verified':
        this.toast.success(
          '¡Teléfono Verificado!',
          'Tu número de teléfono ha sido verificado exitosamente.',
        );
        break;

      case 'level_2_achieved':
        this.toast.success(
          '¡Level 2 Desbloqueado!',
          'Tus documentos han sido verificados. Ahora puedes publicar autos y hacer reservas.',
        );
        break;

      case 'selfie_verified':
        this.toast.success(
          '¡Selfie Verificado!',
          'Tu identidad facial ha sido verificada correctamente.',
        );
        break;

      case 'level_3_achieved':
        this.toast.success(
          '🎉 ¡Level 3 Completo!',
          '¡Felicitaciones! Tienes acceso completo a todas las funcionalidades de AutoRenta.',
          7000,
        );
        break;

      default:
        this.logger.debug('[VerificationNotifications] Unknown event:', eventType);
    }
  }

  /**
   * Cleanup on destroy
   */
  ngOnDestroy(): void {
    this.unsubscribe?.();
  }
}
