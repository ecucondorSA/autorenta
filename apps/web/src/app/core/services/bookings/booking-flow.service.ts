import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { Booking, BookingStatus } from '@core/models';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingConfirmationService } from '@core/services/bookings/booking-confirmation.service';
import { isValidStatusTransition } from '@core/services/bookings/booking-flow-helpers';
import { BookingNotificationsService } from '@core/services/bookings/booking-notifications.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { FgoV1_1Service } from '@core/services/verification/fgo-v1-1.service';
import { ReviewsService } from '@core/services/cars/reviews.service';
import { NotificationsService } from '@core/services/infrastructure/user-notifications.service';

/**
 * BookingFlowService
 *
 * Servicio centralizado que coordina el flujo completo de contratación:
 * - Transiciones de estado
 * - Check-in y Check-out
 * - Notificaciones automáticas
 * - Navegación contextual
 * - Validaciones de flujo
 *
 * @example
 * ```typescript
 * // En un componente
 * constructor(private bookingFlow: BookingFlowService) {}
 *
 * async onApproveBooking(bookingId: string) {
 *   await this.bookingFlow.approveBooking(bookingId);
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class BookingFlowService {
  private readonly bookingsService = inject(BookingsService);
  private readonly fgoService = inject(FgoV1_1Service);
  private readonly confirmationService = inject(BookingConfirmationService);
  private readonly reviewsService = inject(ReviewsService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly bookingNotifications = inject(BookingNotificationsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /**
   * Obtiene las acciones disponibles para un booking según su estado y el rol del usuario
   */
  async getAvailableActions(
    booking: Booking,
    _userRole: 'owner' | 'renter' | 'both',
  ): Promise<BookingAction[]> {
    const actions: BookingAction[] = [];
    const status = booking.status;
    const currentUserId = this.authService.session$()?.user?.id;
    const isApprovalFlow = !!booking.payment_mode;

    if (!currentUserId) return actions;

    const isOwner = booking.owner_id === currentUserId;
    const isRenter = booking.renter_id === currentUserId;

    // FASE 1: PENDING - Esperando aprobación
    if (status === 'pending') {
      if (isOwner && isApprovalFlow) {
        actions.push({
          label: 'Aprobar Reserva',
          action: 'approve',
          route: `/bookings/owner/${booking.id}`,
          variant: 'primary',
          icon: 'checkmark-circle',
        });
        actions.push({
          label: 'Rechazar',
          action: 'reject',
          route: `/bookings/owner/${booking.id}`,
          variant: 'danger',
          icon: 'close-circle',
        });
      }
      if (isRenter) {
        if (isApprovalFlow) {
          actions.push({
            label: 'Ver Estado',
            action: 'view',
            route: `/bookings/${booking.id}`,
            variant: 'secondary',
            icon: 'eye',
          });
        } else {
          actions.push({
            label: 'Completar Pago',
            action: 'pay',
            route: `/bookings/${booking.id}/detail-payment`,
            variant: 'primary',
            icon: 'card',
          });
        }
        actions.push({
          label: 'Cancelar Solicitud',
          action: 'cancel',
          route: `/bookings/${booking.id}`,
          variant: 'secondary',
          icon: 'close',
        });
      }
    }

    if (status === 'pending_payment') {
      if (isRenter) {
        actions.push({
          label: 'Completar Pago',
          action: 'pay',
          route: `/bookings/${booking.id}/payment`,
          variant: 'primary',
          icon: 'card',
        });
      }
    }

    // FASE 2: CONFIRMED - Pago completado, listo para check-in
    if (status === 'confirmed') {
      if (isOwner) {
        actions.push({
          label: 'Realizar Check-In',
          action: 'owner-check-in',
          route: `/bookings/${booking.id}/owner-check-in`,
          variant: 'primary',
          icon: 'checkmark-done',
          description: 'Inspección pre-entrega del vehículo',
        });
      }
      if (isRenter) {
        actions.push({
          label: 'Ver Detalles',
          action: 'view',
          route: `/bookings/${booking.id}`,
          variant: 'secondary',
          icon: 'eye',
        });
      }
    }

    // FASE 3: IN_PROGRESS - Alquiler activo
    if (status === 'in_progress') {
      const completionStatus = booking.completion_status;

      if (isRenter) {
        // FIX: Consider completion_status for renter actions
        if (completionStatus === 'pending_renter' || completionStatus === 'pending_both') {
          actions.push({
            label: 'Confirmar Devolución',
            action: 'confirm-checkout',
            route: `/bookings/${booking.id}/check-out`,
            variant: 'primary',
            icon: 'checkmark-circle',
            description: 'Confirmar que el auto fue devuelto',
          });
        } else if (!completionStatus || completionStatus === 'active') {
          actions.push({
            label: 'Realizar Check-Out',
            action: 'renter-check-out',
            route: `/bookings/${booking.id}/check-out`,
            variant: 'primary',
            icon: 'log-out',
            description: 'Devolución del vehículo',
          });
        } else {
          // returned, pending_owner, funds_released - just view
          actions.push({
            label: 'Ver Estado',
            action: 'view',
            route: `/bookings/${booking.id}`,
            variant: 'secondary',
            icon: 'eye',
          });
        }
      }
      if (isOwner) {
        // FIX: Consider completion_status for owner actions
        if (
          completionStatus === 'pending_owner' ||
          completionStatus === 'pending_both' ||
          completionStatus === 'returned'
        ) {
          actions.push({
            label: 'Confirmar Devolución',
            action: 'owner-check-out',
            route: `/bookings/${booking.id}/owner-check-out`,
            variant: 'primary',
            icon: 'checkmark-done',
            description: 'Verificar el vehículo y confirmar recepción',
          });
        } else {
          actions.push({
            label: 'Ver Ubicación',
            action: 'track',
            route: `/bookings/${booking.id}`,
            variant: 'secondary',
            icon: 'location',
          });
        }
      }
    }

    // FASE 4: COMPLETED - Finalizado, disponible para reseñas
    if (status === 'completed') {
      const canReview = await this.canLeaveReview(booking, currentUserId);
      if (canReview.canReview) {
        actions.push({
          label: 'Dejar Reseña',
          action: 'review',
          route: `/bookings/${booking.id}`,
          variant: 'primary',
          icon: 'star',
          description: canReview.description,
        });
      }
    }

    return actions;
  }

  /**
   * Verifica si el usuario puede dejar una reseña
   * Comprueba:
   * 1. Estado del booking es 'completed'
   * 2. Está dentro de la ventana de 14 días
   * 3. El usuario no ha dejado una reseña ya (via ReviewsService)
   */
  private async canLeaveReview(
    booking: Booking,
    _userId: string,
  ): Promise<{
    canReview: boolean;
    description?: string;
  }> {
    if (booking.status !== 'completed') {
      return { canReview: false };
    }

    // Verificar ventana de 14 días
    const completedDate = booking.updated_at ? new Date(booking.updated_at) : null;
    if (!completedDate) {
      return { canReview: false };
    }

    const daysSinceCompleted = Math.floor(
      (Date.now() - completedDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceCompleted > 14) {
      return {
        canReview: false,
        description: 'Período de reseñas expirado (14 días)',
      };
    }

    // Verificar con ReviewsService si el usuario ya dejó reseña
    try {
      const canReviewAccordingToService = await this.reviewsService.canReviewBooking(booking.id);
      if (!canReviewAccordingToService) {
        return {
          canReview: false,
          description: 'Ya has dejado tu reseña para esta reserva',
        };
      }
    } catch (error) {
      // Si hay error en la verificación, permitir ver la acción pero dejar que el servicio maneje el error al guardar
      console.warn('Error checking review status:', error);
    }

    return {
      canReview: true,
      description: `Tienes ${14 - daysSinceCompleted} días restantes para dejar tu reseña`,
    };
  }

  /**
   * Obtiene el siguiente paso recomendado en el flujo
   */
  async getNextStep(booking: Booking, _userRole: 'owner' | 'renter'): Promise<NextStep | null> {
    const status = booking.status;
    const currentUserId = this.authService.session$()?.user?.id;
    const isApprovalFlow = !!booking.payment_mode;
    if (!currentUserId) return null;

    const isOwner = booking.owner_id === currentUserId;
    const isRenter = booking.renter_id === currentUserId;

    // Flujo del Locador
    if (isOwner) {
      if (status === 'pending') {
        if (isApprovalFlow) {
          return {
            title: 'Revisar Solicitud',
            description: 'Un locatario quiere reservar tu auto. Revisa y aprueba la solicitud.',
            action: 'Aprobar o Rechazar',
            route: `/bookings/owner/${booking.id}`,
            priority: 'high',
          };
        }

        return {
          title: 'Esperando Pago',
          description: 'El locatario debe completar el pago para confirmar la reserva.',
          action: 'Ver Detalles',
          route: `/bookings/owner/${booking.id}`,
          priority: 'medium',
        };
      }
      if (status === 'pending_payment') {
        return {
          title: 'Pago en proceso',
          description: 'El locatario está completando el pago. Te avisaremos cuando confirme.',
          action: 'Ver Detalles',
          route: `/bookings/owner/${booking.id}`,
          priority: 'medium',
        };
      }
      if (status === 'confirmed') {
        return {
          title: 'Realizar Check-In',
          description: 'Inspecciona el vehículo antes de entregarlo al locatario.',
          action: 'Iniciar Check-In',
          route: `/bookings/${booking.id}/owner-check-in`,
          priority: 'high',
        };
      }
      if (status === 'in_progress') {
        // FIX: Consider completion_status for proper next step
        const completionStatus = booking.completion_status;

        if (completionStatus === 'pending_owner' || completionStatus === 'pending_both') {
          return {
            title: 'Confirmar Devolución',
            description:
              'El locatario devolvió el auto. Confirmá la recepción para liberar los fondos.',
            action: 'Confirmar Check-Out',
            route: `/bookings/${booking.id}/owner-check-out`,
            priority: 'high',
          };
        }

        if (completionStatus === 'returned') {
          return {
            title: 'Revisar Devolución',
            description: 'El auto fue devuelto. Realiza la inspección final.',
            action: 'Inspeccionar',
            route: `/bookings/${booking.id}/owner-check-out`,
            priority: 'high',
          };
        }

        return {
          title: 'Esperando Devolución',
          description: 'El locatario está usando el vehículo. Prepárate para el check-out.',
          action: 'Ver Detalles',
          route: `/bookings/owner/${booking.id}`,
          priority: 'medium',
        };
      }
      if (status === 'completed') {
        const canReview = await this.canLeaveReview(booking, currentUserId);
        if (canReview.canReview) {
          return {
            title: 'Dejar Reseña',
            description: 'Califica tu experiencia con el locatario.',
            action: 'Escribir Reseña',
            route: `/bookings/owner/${booking.id}`,
            priority: 'low',
          };
        }
      }
      if (
        status === 'pending_dispute_resolution' ||
        status === 'disputed' ||
        status === 'resolved'
      ) {
        return {
          title: 'Revisar Disputa',
          description: 'Hay un reclamo asociado a esta reserva.',
          action: 'Ver disputa',
          route: `/bookings/${booking.id}/disputes`,
          priority: 'high',
        };
      }
    }

    // Flujo del Locatario
    if (isRenter) {
      if (status === 'pending') {
        if (isApprovalFlow) {
          return {
            title: 'Esperando aprobación',
            description: 'El anfitrión está revisando tu solicitud.',
            action: 'Ver Estado',
            route: `/bookings/${booking.id}`,
            priority: 'medium',
          };
        }

        return {
          title: 'Completar Pago',
          description: 'Completá el pago para confirmar tu reserva.',
          action: 'Completar Pago',
          route: `/bookings/${booking.id}/detail-payment`,
          priority: 'high',
        };
      }
      if (status === 'pending_payment') {
        return {
          title: 'Completar Pago',
          description: 'Finalizá el pago para confirmar la reserva.',
          action: 'Completar Pago',
          route: `/bookings/${booking.id}/payment`,
          priority: 'high',
        };
      }
      if (status === 'confirmed') {
        return {
          title: 'Esperando entrega',
          description:
            'El locador realizará el check-in. Luego podrás documentar la recepción del vehículo.',
          action: 'Ver Detalles',
          route: `/bookings/${booking.id}`,
          priority: 'medium',
        };
      }
      if (status === 'in_progress') {
        // FIX: Consider completion_status for proper next step
        const completionStatus = booking.completion_status;

        if (completionStatus === 'pending_renter' || completionStatus === 'pending_both') {
          return {
            title: 'Confirmar Devolución',
            description: 'El propietario está esperando tu confirmación de la devolución.',
            action: 'Confirmar Check-Out',
            route: `/bookings/${booking.id}/check-out`,
            priority: 'high',
          };
        }

        if (completionStatus === 'returned' || completionStatus === 'pending_owner') {
          return {
            title: 'Devolución en proceso',
            description:
              'El propietario está verificando el vehículo. Te avisaremos cuando confirme.',
            action: 'Ver Estado',
            route: `/bookings/${booking.id}`,
            priority: 'medium',
          };
        }

        return {
          title: 'Realizar Check-Out',
          description: 'Cuando devuelvas el vehículo, completa el check-out.',
          action: 'Iniciar Check-Out',
          route: `/bookings/${booking.id}/check-out`,
          priority: 'high',
        };
      }
      if (status === 'completed') {
        const canReview = await this.canLeaveReview(booking, currentUserId);
        if (canReview.canReview) {
          return {
            title: 'Dejar Reseña',
            description: 'Califica tu experiencia con el locador y el vehículo.',
            action: 'Escribir Reseña',
            route: `/bookings/${booking.id}`,
            priority: 'low',
          };
        }
      }
      if (
        status === 'pending_dispute_resolution' ||
        status === 'disputed' ||
        status === 'resolved'
      ) {
        return {
          title: 'Revisar Disputa',
          description: 'Hay un reclamo asociado a esta reserva.',
          action: 'Ver disputa',
          route: `/bookings/${booking.id}/disputes`,
          priority: 'high',
        };
      }
    }

    return null;
  }

  /**
   * Navega al siguiente paso del flujo
   */
  async navigateToNextStep(booking: Booking): Promise<void> {
    // Prefer synchronous session; fall back to async call to ensure session is restored
    const session = this.authService.session$();
    let currentUserId = session?.user?.id;
    if (!currentUserId) {
      const currentUser = await this.authService.getCurrentUser();
      if (!currentUser) {
        await this.router.navigate(['/auth/login']);
        return;
      }
      currentUserId = currentUser.id;
    }

    const userRole = this.getUserRole(booking, currentUserId);
    const nextStep = await this.getNextStep(booking, userRole);
    if (nextStep) {
      await this.router.navigate([nextStep.route]);
    } else {
      // Fallback: go to booking detail
      await this.router.navigate(['/bookings', booking.id]);
    }
  }

  /**
   * Determina el rol del usuario en relación al booking
   */
  private getUserRole(booking: Booking, userId: string): 'owner' | 'renter' {
    if (booking.owner_id === userId) return 'owner';
    if (booking.renter_id === userId) return 'renter';
    throw new Error('User is not part of this booking');
  }

  /**
   * Obtiene el estado visual del booking para mostrar en UI
   */
  getBookingStatusInfo(booking: Booking): BookingStatusInfo {
    const status = booking.status;
    const statusMap: Record<BookingStatus, BookingStatusInfo> = {
      pending: {
        label: 'Pendiente',
        color: 'warning',
        icon: 'time-outline',
        description: 'Esperando aprobación del dueño',
      },
      pending_approval: {
        label: 'Pendiente de Aprobación',
        color: 'warning',
        icon: 'time-outline',
        description: 'Esperando aprobación del dueño',
      },
      confirmed: {
        label: 'Confirmada',
        color: 'success',
        icon: 'checkmark-circle-outline',
        description: '¡Todo listo! Coordiná la entrega con el dueño',
      },
      in_progress: {
        label: 'En curso',
        color: 'primary',
        icon: 'car-sport-outline',
        description: 'Disfrutá tu viaje',
      },
      completed: {
        label: 'Completada',
        color: 'success',
        icon: 'flag-outline',
        description: 'La reserva finalizó correctamente',
      },
      cancelled: {
        label: 'Cancelada',
        color: 'danger',
        icon: 'close-circle-outline',
        description: 'La reserva fue cancelada',
      },
      expired: {
        label: 'Expirada',
        color: 'medium',
        icon: 'hourglass-outline',
        description: 'La solicitud expiró',
      },
      no_show: {
        label: 'No show',
        color: 'danger',
        icon: 'alert-circle-outline',
        description: 'El conductor no se presentó',
      },
      pending_payment: {
        label: 'Pago pendiente',
        color: 'warning',
        icon: 'card-outline',
        description: 'Esperando el pago para confirmar',
      },
      rejected: {
        label: 'Rechazada',
        color: 'danger',
        icon: 'close-circle-outline',
        description: 'La solicitud fue rechazada',
      },
      pending_dispute_resolution: {
        label: 'En disputa',
        color: 'danger',
        icon: 'alert-circle-outline',
        description: 'El equipo de soporte está revisando el caso',
      },
      pending_review: {
        label: 'En Revisión Final',
        color: 'warning',
        icon: 'search-outline',
        description: 'Esperando confirmación post-reserva o reporte de incidentes',
      },
      disputed: {
        label: 'En Disputa',
        color: 'danger',
        icon: 'hammer-outline',
        description: 'Hay una disputa activa. Caso en revisión.',
      },
      resolved: {
        label: 'Disputa Resuelta',
        color: 'success',
        icon: 'checkmark-circle-outline',
        description: 'Disputa resuelta. Fondos en proceso de liberación.',
      },
      cancelled_renter: {
        label: 'Cancelada por Locatario',
        color: 'danger',
        icon: 'close-circle-outline',
        description: 'La reserva fue cancelada por el locatario',
      },
      cancelled_owner: {
        label: 'Cancelada por Anfitrión',
        color: 'danger',
        icon: 'close-circle-outline',
        description: 'La reserva fue cancelada por el anfitrión',
      },
      cancelled_system: {
        label: 'Cancelada por Sistema',
        color: 'danger',
        icon: 'alert-circle-outline',
        description: 'La reserva fue cancelada automáticamente por el sistema',
      },
      payment_validation_failed: {
        label: 'Error de Pago',
        color: 'danger',
        icon: 'card-outline',
        description: 'El pago no pudo ser validado. Por favor, intenta nuevamente.',
      },
    };

    const baseInfo = statusMap[status] || {
      label: status,
      color: 'medium',
      icon: 'help-circle',
      description: '',
    };

    // Distinguish pending status based on payment_mode
    // If payment_mode is set -> approval flow (waiting for owner)
    // If payment_mode is NOT set -> traditional flow (waiting for payment)
    if (status === 'pending') {
      if (booking.payment_mode) {
        return {
          ...baseInfo,
          label: 'Esperando aprobación',
          description: 'El propietario está revisando tu solicitud',
        };
      } else {
        return {
          ...baseInfo,
          label: 'Pendiente de pago',
          description: 'Completá el pago para confirmar la reserva',
        };
      }
    }

    return baseInfo;
  }

  /**
   * Valida si una transición desde el estado actual del booking hacia el target es permitida.
   * Esta función es una pequeña envoltura usada por guards y componentes que esperan
   * recibir un objeto con la forma { valid: boolean; error?: string }
   */
  validateStatusTransition(
    booking: Booking,
    target: BookingStatus,
  ): { valid: boolean; error?: string } {
    const result = isValidStatusTransition(booking.status, target);
    return { valid: result.valid, error: result.reason };
  }
}

/**
 * Interfaz para acciones disponibles en un booking
 */
export interface BookingAction {
  label: string;
  action: string;
  route: string;
  variant: 'primary' | 'secondary' | 'danger' | 'success';
  icon: string;
  description?: string;
}

/**
 * Interfaz para el siguiente paso en el flujo
 */
export interface NextStep {
  title: string;
  description: string;
  action: string;
  route: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Información del estado del booking para UI
 */
export interface BookingStatusInfo {
  label: string;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'medium';
  icon: string;
  description: string;
}
