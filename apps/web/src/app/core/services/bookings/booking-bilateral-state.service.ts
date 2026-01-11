import { Injectable } from '@angular/core';
import type { Booking } from '@core/models';

/**
 * Paso del flujo bilateral de confirmación
 * 1-6 representan el progreso desde reserva confirmada hasta completado
 */
export type FlowStep = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Estado canónico del flujo bilateral
 */
export type BilateralFlowState =
  | 'CONFIRMED'        // Reserva confirmada, esperando inicio
  | 'DELIVERED'        // Vehículo entregado, viaje iniciado
  | 'IN_PROGRESS'      // Viaje en curso
  | 'RETURNED'         // Vehículo devuelto, esperando inspección del owner
  | 'PENDING_OWNER'    // Owner debe confirmar recepción
  | 'PENDING_RENTER'   // Renter debe confirmar liberación de pago
  | 'DAMAGE_REVIEW'    // Daños reportados, renter debe responder
  | 'DISPUTED'         // En disputa activa
  | 'COMPLETED';       // Completado, fondos liberados

/**
 * Información completa del paso actual del flujo
 */
export interface FlowStepInfo {
  /** Estado canónico */
  state: BilateralFlowState;
  /** Número de paso (1-6) */
  step: FlowStep;
  /** Total de pasos */
  totalSteps: 6;
  /** Título amigable del paso actual */
  title: string;
  /** Descripción de qué hacer */
  description: string;
  /** Quién debe actuar */
  actor: 'owner' | 'renter' | 'none';
  /** Indica si es el turno del usuario actual */
  isYourTurn: boolean;
  /** Acción principal disponible */
  action: {
    label: string;
    route?: string;
    actionType?: 'navigate' | 'confirm' | 'resolve';
  } | null;
  /** Vista previa del próximo paso */
  nextStepPreview: string;
  /** Segundos restantes para auto-release (si aplica) */
  autoReleaseCountdown: number | null;
  /** Información de daños (si aplica) */
  damageInfo: {
    hasDamages: boolean;
    amountCents: number;
    description: string | null;
  } | null;
}

/**
 * Configuración de labels por estado
 */
const STATE_CONFIG: Record<BilateralFlowState, {
  step: FlowStep;
  ownerTitle: string;
  renterTitle: string;
  ownerDesc: string;
  renterDesc: string;
  actor: 'owner' | 'renter' | 'none';
  ownerAction: { label: string; route?: string; actionType?: 'navigate' | 'confirm' | 'resolve' } | null;
  renterAction: { label: string; route?: string; actionType?: 'navigate' | 'confirm' | 'resolve' } | null;
  nextPreview: string;
}> = {
  CONFIRMED: {
    step: 1,
    ownerTitle: 'Reserva confirmada',
    renterTitle: 'Reserva confirmada',
    ownerDesc: 'Esperando la fecha de inicio del alquiler.',
    renterDesc: 'Esperando la fecha de inicio del alquiler.',
    actor: 'none',
    ownerAction: null,
    renterAction: null,
    nextPreview: 'El locatario retirará el vehículo',
  },
  DELIVERED: {
    step: 2,
    ownerTitle: 'Vehículo entregado',
    renterTitle: 'Vehículo recibido',
    ownerDesc: 'El locatario tiene el vehículo.',
    renterDesc: 'Ya tenés el vehículo.',
    actor: 'none',
    ownerAction: null,
    renterAction: null,
    nextPreview: 'Viaje en curso',
  },
  IN_PROGRESS: {
    step: 3,
    ownerTitle: 'Viaje en curso',
    renterTitle: 'Viaje en curso',
    ownerDesc: 'El locatario está usando el vehículo.',
    renterDesc: 'Disfrutá tu viaje.',
    actor: 'none',
    ownerAction: null,
    renterAction: null,
    nextPreview: 'El locatario devolverá el vehículo',
  },
  RETURNED: {
    step: 4,
    ownerTitle: 'Confirmar recepción',
    renterTitle: 'Esperando al anfitrión',
    ownerDesc: 'El locatario devolvió el vehículo. Revisá el estado y confirmá la recepción.',
    renterDesc: 'Devolviste el vehículo. El anfitrión está revisando el estado.',
    actor: 'owner',
    ownerAction: { label: 'Confirmar recepción', route: 'owner-check-out', actionType: 'navigate' },
    renterAction: null,
    nextPreview: 'Confirmar y liberar el pago',
  },
  PENDING_OWNER: {
    step: 4,
    ownerTitle: 'Confirmar recepción',
    renterTitle: 'Esperando al anfitrión',
    ownerDesc: 'Revisá el vehículo y confirmá que lo recibiste.',
    renterDesc: 'Esperando que el anfitrión confirme la recepción.',
    actor: 'owner',
    ownerAction: { label: 'Confirmar recepción', route: 'owner-check-out', actionType: 'navigate' },
    renterAction: null,
    nextPreview: 'Confirmar y liberar el pago',
  },
  PENDING_RENTER: {
    step: 5,
    ownerTitle: 'Esperando al viajero',
    renterTitle: 'Confirmar liberación de pago',
    ownerDesc: 'Ya confirmaste la recepción. Esperando que el locatario confirme.',
    renterDesc: 'El anfitrión confirmó que el vehículo está bien. Confirmá para liberar el pago.',
    actor: 'renter',
    ownerAction: null,
    renterAction: { label: 'Confirmar y liberar pago', actionType: 'confirm' },
    nextPreview: 'Viaje completado',
  },
  DAMAGE_REVIEW: {
    step: 5,
    ownerTitle: 'Daños reportados',
    renterTitle: 'Revisar daños reportados',
    ownerDesc: 'Reportaste daños. Esperando respuesta del locatario.',
    renterDesc: 'El anfitrión reportó daños en el vehículo. Revisá y respondé.',
    actor: 'renter',
    ownerAction: null,
    renterAction: { label: 'Revisar daños', actionType: 'resolve' },
    nextPreview: 'Resolver y completar',
  },
  DISPUTED: {
    step: 5,
    ownerTitle: 'En disputa',
    renterTitle: 'En disputa',
    ownerDesc: 'El caso está siendo revisado por soporte.',
    renterDesc: 'El caso está siendo revisado por soporte.',
    actor: 'none',
    ownerAction: null,
    renterAction: null,
    nextPreview: 'Resolución del caso',
  },
  COMPLETED: {
    step: 6,
    ownerTitle: 'Viaje completado',
    renterTitle: 'Viaje completado',
    ownerDesc: 'El viaje finalizó exitosamente. Los fondos fueron liberados.',
    renterDesc: 'El viaje finalizó exitosamente. Tu garantía fue liberada.',
    actor: 'none',
    ownerAction: null,
    renterAction: null,
    nextPreview: '',
  },
};

/**
 * BookingBilateralStateService
 *
 * Servicio que traduce el estado técnico del booking a información
 * amigable para el usuario, determinando:
 * - Qué paso del flujo es el actual
 * - Quién debe actuar (owner o renter)
 * - Qué acción está disponible
 * - Cuánto tiempo queda para auto-release
 */
@Injectable({
  providedIn: 'root',
})
export class BookingBilateralStateService {
  /**
   * Obtiene la información completa del paso actual del flujo
   */
  getFlowStep(booking: Booking, currentUserId: string): FlowStepInfo {
    const isOwner = booking.owner_id === currentUserId;
    const state = this.deriveState(booking);
    const config = STATE_CONFIG[state];

    const isYourTurn =
      (config.actor === 'owner' && isOwner) ||
      (config.actor === 'renter' && !isOwner);

    const action = isOwner ? config.ownerAction : config.renterAction;

    // Calcular countdown si aplica
    let autoReleaseCountdown: number | null = null;
    if (booking.auto_release_at) {
      const releaseTime = new Date(booking.auto_release_at).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((releaseTime - now) / 1000));
      autoReleaseCountdown = diff > 0 ? diff : null;
    }

    // Información de daños
    let damageInfo: FlowStepInfo['damageInfo'] = null;
    if (booking.has_damages) {
      damageInfo = {
        hasDamages: true,
        amountCents: booking.damage_amount_cents || 0,
        description: booking.damage_description || null,
      };
    }

    return {
      state,
      step: config.step,
      totalSteps: 6,
      title: isOwner ? config.ownerTitle : config.renterTitle,
      description: isOwner ? config.ownerDesc : config.renterDesc,
      actor: config.actor,
      isYourTurn,
      action: action ? { ...action } : null,
      nextStepPreview: config.nextPreview,
      autoReleaseCountdown,
      damageInfo,
    };
  }

  /**
   * Deriva el estado canónico del flujo a partir del booking
   */
  private deriveState(booking: Booking): BilateralFlowState {
    const status = booking.status;

    // Completado
    if (status === 'completed' || booking.funds_released_at) {
      return 'COMPLETED';
    }

    // En disputa
    if (booking.dispute_status === 'open' || booking.inspection_status === 'disputed') {
      return 'DISPUTED';
    }

    // Daños reportados, esperando respuesta del renter
    if (
      (status === 'damage_reported' || booking.inspection_status === 'damaged') &&
      booking.has_damages &&
      !booking.renter_confirmed_payment
    ) {
      return 'DAMAGE_REVIEW';
    }

    // Owner confirmó sin daños, esperando renter
    if (
      (status === 'inspected_good' || booking.inspection_status === 'good') &&
      booking.owner_confirmed_delivery &&
      !booking.renter_confirmed_payment
    ) {
      return 'PENDING_RENTER';
    }

    // Vehículo devuelto, esperando owner
    if (booking.returned_at && !booking.owner_confirmed_delivery) {
      // Puede estar en status 'returned' o aún en 'in_progress' pero con returned_at
      return 'RETURNED';
    }

    // Viaje en curso
    if (status === 'in_progress') {
      // Si tiene check_in_completed_at, ya fue entregado
      if ((booking as Record<string, unknown>)['check_in_completed_at']) {
        return 'IN_PROGRESS';
      }
      return 'IN_PROGRESS';
    }

    // Confirmado, esperando inicio
    if (status === 'confirmed') {
      return 'CONFIRMED';
    }

    // Fallback
    return 'CONFIRMED';
  }

  /**
   * Obtiene solo el número de paso actual (para progress bars simples)
   */
  getCurrentStep(booking: Booking): FlowStep {
    const state = this.deriveState(booking);
    return STATE_CONFIG[state].step;
  }

  /**
   * Verifica si el usuario actual debe actuar
   */
  isUsersTurn(booking: Booking, currentUserId: string): boolean {
    const info = this.getFlowStep(booking, currentUserId);
    return info.isYourTurn;
  }

  /**
   * Formatea el countdown a string legible (ej: "23h 45m")
   */
  formatCountdown(seconds: number): string {
    if (seconds <= 0) return '';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Obtiene el label amigable para un status técnico
   */
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      confirmed: 'Confirmada',
      in_progress: 'En curso',
      returned: 'Devuelto',
      inspected_good: 'Inspección OK',
      damage_reported: 'Daños reportados',
      completed: 'Completada',
      cancelled: 'Cancelada',
      pending: 'Pendiente',
      pending_payment: 'Pago pendiente',
      expired: 'Expirada',
    };
    return labels[status] || status;
  }
}
