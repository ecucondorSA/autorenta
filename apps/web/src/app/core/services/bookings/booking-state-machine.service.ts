import { Injectable } from '@angular/core';
import { Booking } from '@core/models';

/**
 * Estados canónicos del booking (Finite State Machine)
 *
 * Este enum representa la ÚNICA fuente de verdad para el estado del booking.
 * Todos los componentes deben usar deriveState() para determinar el estado.
 */
export type BookingState =
  | 'DRAFT' // Solicitud creada, no pagada
  | 'PENDING_PAYMENT' // Esperando pago/autorización
  | 'CONFIRMED' // Pagado, esperando check-in
  | 'ACTIVE' // En progreso (vehículo entregado)
  | 'RETURNED' // Vehículo devuelto, esperando inspección
  | 'INSPECTED_GOOD' // Inspeccionado OK, esperando confirmación final (opcional/auto)
  | 'DAMAGE_REPORTED' // Con daños, esperando aceptación/disputa del locatario
  | 'PENDING_OWNER' // Legacy: Esperando confirmación del propietario
  | 'PENDING_RENTER' // Legacy: Esperando confirmación del locatario
  | 'FUNDS_RELEASED' // Fondos liberados
  | 'COMPLETED' // Finalizado exitosamente
  | 'CANCELLED' // Cancelado
  | 'DISPUTED'; // En disputa activa

/**
 * Transiciones validas entre estados
 *
 * Define las transiciones legales del sistema.
 * Usar canTransition() para validar antes de cambiar estado.
 */
export const VALID_TRANSITIONS: Record<BookingState, BookingState[]> = {
  DRAFT: ['PENDING_PAYMENT', 'CANCELLED'],
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['RETURNED', 'DISPUTED'],
  RETURNED: ['INSPECTED_GOOD', 'DAMAGE_REPORTED', 'DISPUTED', 'PENDING_OWNER', 'PENDING_RENTER'],
  INSPECTED_GOOD: ['FUNDS_RELEASED', 'COMPLETED', 'DISPUTED'],
  DAMAGE_REPORTED: ['FUNDS_RELEASED', 'DISPUTED', 'COMPLETED'],
  PENDING_OWNER: ['FUNDS_RELEASED', 'DISPUTED'],
  PENDING_RENTER: ['FUNDS_RELEASED', 'DISPUTED'],
  FUNDS_RELEASED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ['FUNDS_RELEASED', 'CANCELLED', 'COMPLETED'],
};

/**
 * Mapeo de estados FSM a labels en espanol para UI
 */
export const STATE_LABELS: Record<BookingState, string> = {
  DRAFT: 'Borrador',
  PENDING_PAYMENT: 'Pago Pendiente',
  CONFIRMED: 'Confirmada',
  ACTIVE: 'En Progreso',
  RETURNED: 'Vehículo Devuelto',
  INSPECTED_GOOD: 'Inspección Aprobada',
  DAMAGE_REPORTED: 'Daños Reportados',
  PENDING_OWNER: 'Esperando Propietario',
  PENDING_RENTER: 'Esperando Locatario',
  FUNDS_RELEASED: 'Fondos Liberados',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  DISPUTED: 'En Disputa',
};

/**
 * Acciones disponibles por estado y rol
 */
export const STATE_ACTIONS: Record<BookingState, { owner: string[]; renter: string[] }> = {
  DRAFT: { owner: ['approve', 'reject'], renter: ['cancel'] },
  PENDING_PAYMENT: { owner: [], renter: ['pay', 'cancel'] },
  CONFIRMED: { owner: ['check_in'], renter: ['check_in'] },
  ACTIVE: { owner: ['mark_returned'], renter: ['mark_returned'] },
  RETURNED: { owner: ['submit_inspection'], renter: [] }, // Only owner inspects now
  INSPECTED_GOOD: { owner: [], renter: ['confirm_release'] },
  DAMAGE_REPORTED: { owner: [], renter: ['accept_damage', 'dispute_damage'] },
  PENDING_OWNER: { owner: ['confirm'], renter: [] },
  PENDING_RENTER: { owner: [], renter: ['confirm'] },
  FUNDS_RELEASED: { owner: [], renter: [] },
  COMPLETED: { owner: ['review'], renter: ['review'] },
  CANCELLED: { owner: [], renter: [] },
  DISPUTED: { owner: ['provide_evidence'], renter: ['provide_evidence'] },
};

/**
 * BookingStateMachineService
 *
 * Servicio centralizado que actúa como ÚNICA fuente de verdad para
 * el estado del booking. Elimina la ambigüedad de tener múltiples
 * campos (status, completion_status, flags booleanos) que determinan
 * el estado de forma dispersa.
 *
 * Uso:
 * ```typescript
 * const state = this.fsm.deriveState(booking);
 * const actions = this.fsm.getAvailableActions(state, 'owner');
 * const canConfirm = this.fsm.canTransition(state, 'FUNDS_RELEASED');
 * ```
 */
@Injectable({ providedIn: 'root' })
export class BookingStateMachineService {
  /**
   * Deriva el estado canónico desde los campos del booking.
   * Esta es la ÚNICA función que debe usarse para determinar el estado.
   *
   * El orden de evaluación importa - estados más específicos primero.
   */
  deriveState(booking: Booking | null | undefined): BookingState {
    if (!booking) return 'DRAFT';

    // 1. Cancelled takes precedence
    if (booking.status === 'cancelled') return 'CANCELLED';

    // 2. Check for disputes
    if (booking.dispute_open_at && booking.dispute_status === 'open') return 'DISPUTED';

    // 3. Completed flow (check funds_released_at specifically)
    if (booking.status === 'completed' && booking.funds_released_at) return 'COMPLETED';
    if (booking.funds_released_at) return 'FUNDS_RELEASED';

    // 4. Bilateral confirmation V2
    if (booking.returned_at) {
      const ownerConfirmed = !!booking.owner_confirmed_delivery;
      const renterConfirmed = !!booking.renter_confirmed_payment;

      // V2 Flags
      // inspection_status can be 'pending', 'good', 'damaged', 'disputed'
      // We prioritize explicit flags first

      if (ownerConfirmed && renterConfirmed) return 'FUNDS_RELEASED';

      if (booking.has_damages) {
        if (booking.dispute_status === 'open' || booking.inspection_status === 'disputed')
          return 'DISPUTED';
        return 'DAMAGE_REPORTED';
      }

      if (ownerConfirmed && !renterConfirmed) {
        // If no damage, it might be INSPECTED_GOOD
        return 'INSPECTED_GOOD';
      }

      // Legacy fallback
      if (ownerConfirmed && !renterConfirmed) return 'PENDING_RENTER';
      if (!ownerConfirmed && renterConfirmed) return 'PENDING_OWNER';

      return 'RETURNED';
    }

    // 5. Active rental
    if (booking.status === 'in_progress') return 'ACTIVE';

    // 6. Pre-rental states
    if (booking.status === 'confirmed' || booking.paid_at) return 'CONFIRMED';
    if (booking.payment_intent_id || booking.wallet_lock_id) return 'PENDING_PAYMENT';

    // 7. Default
    return 'DRAFT';
  }

  /**
   * Valida si una transicion de estado es permitida
   */
  canTransition(from: BookingState, to: BookingState): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /**
   * Obtiene las acciones disponibles para un estado y rol
   */
  getAvailableActions(state: BookingState, role: 'owner' | 'renter'): string[] {
    return STATE_ACTIONS[state]?.[role] ?? [];
  }

  /**
   * Obtiene el label en espanol para un estado
   */
  getStateLabel(state: BookingState): string {
    return STATE_LABELS[state] ?? state;
  }

  /**
   * Verifica si el booking esta en un estado terminal (no mas transiciones)
   */
  isTerminalState(state: BookingState): boolean {
    return VALID_TRANSITIONS[state]?.length === 0;
  }

  /**
   * Verifica si el booking requiere accion del usuario especificado
   */
  requiresActionFrom(booking: Booking, role: 'owner' | 'renter'): boolean {
    const state = this.deriveState(booking);
    const actions = this.getAvailableActions(state, role);
    return actions.length > 0;
  }

  /**
   * Obtiene el mensaje de estado pendiente para mostrar al usuario
   */
  getPendingMessage(booking: Booking, role: 'owner' | 'renter'): string | null {
    const state = this.deriveState(booking);

    if (state === 'PENDING_OWNER' && role === 'owner') {
      return 'Esperando tu confirmación como propietario';
    }
    if (state === 'PENDING_RENTER' && role === 'renter') {
      return 'Esperando tu confirmación como locatario';
    }
    if (state === 'RETURNED') {
      if (role === 'owner' && !booking.owner_confirmed_delivery) {
        return 'Confirma la recepción del vehículo';
      }
      if (role === 'renter' && !booking.renter_confirmed_payment) {
        return 'Confirma la liberación del pago';
      }
    }

    return null;
  }

  /**
   * Mapea el estado FSM al step index del timeline (0-8)
   * Útil para componentes que muestran progreso
   */
  getTimelineStepIndex(state: BookingState): number {
    const stateToStep: Record<BookingState, number> = {
      DRAFT: 0,
      PENDING_PAYMENT: 1,
      CONFIRMED: 2,
      ACTIVE: 3,
      RETURNED: 4,
      PENDING_OWNER: 5,
      PENDING_RENTER: 5,
      INSPECTED_GOOD: 5,
      DAMAGE_REPORTED: 6,
      FUNDS_RELEASED: 7,
      COMPLETED: 8,
      CANCELLED: -1,
      DISPUTED: -1,
    };
    return stateToStep[state] ?? 0;
  }
}
