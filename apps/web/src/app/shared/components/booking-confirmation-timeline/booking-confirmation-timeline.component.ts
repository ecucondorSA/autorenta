
import {Component, computed, inject, input, output, Signal,
  ChangeDetectionStrategy} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Booking } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { BookingConfirmationService } from '../../../core/services/booking-confirmation.service';

/**
 * Timeline step interface
 */
export interface TimelineStep {
  key: string;
  label: string;
  description: string;
  completed: boolean;
  timestamp: string | null;
  actor: string | null;
  actorId: string | null;
  isConditional?: boolean;
  requiresAction?: boolean;
  actionLabel?: string;
  actionDescription?: string;
  metadata?: {
    damageAmount?: number;
    damageDescription?: string;
  };
}

/**
 * BookingConfirmationTimelineComponent
 *
 * Displays the bilateral confirmation timeline for a booking showing:
 * - All 9 stages of the booking lifecycle
 * - Completion status, timestamps, and actors for each step
 * - Action buttons for pending confirmations (role-based)
 * - Real-time updates via signals
 * - Mobile responsive design
 *
 * Usage:
 * ```html
 * <app-booking-confirmation-timeline
 *   [booking]="booking()"
 *   (confirmationRequested)="handleConfirmation($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-booking-confirmation-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  templateUrl: './booking-confirmation-timeline.component.html',
  styleUrl: './booking-confirmation-timeline.component.css',
})
export class BookingConfirmationTimelineComponent {
  private readonly authService = inject(AuthService);
  private readonly confirmationService = inject(BookingConfirmationService);

  // ==================== INPUTS ====================
  /**
   * Booking data with all confirmation fields
   */
  booking = input.required<Booking>();

  /**
   * Car owner name for display
   */
  ownerName = input<string>('el anfitrión');

  /**
   * Renter name for display
   */
  renterName = input<string>('el locatario');

  // ==================== OUTPUTS ====================
  /**
   * Emitted when user clicks an action button
   * Parent component handles the actual confirmation logic
   */
  confirmationRequested = output<{
    action: 'owner_confirm' | 'renter_confirm' | 'mark_returned';
    bookingId: string;
  }>();

  // ==================== COMPUTED SIGNALS ====================

  /**
   * Current authenticated user
   */
  private readonly currentUser = computed(() => this.authService.session$()?.user);

  /**
   * Is current user the booking renter
   */
  readonly isRenter = computed(() => {
    const booking = this.booking();
    const user = this.currentUser();
    return booking?.renter_id === user?.id;
  });

  /**
   * Is current user the car owner
   */
  readonly isOwner = computed(() => {
    const booking = this.booking();
    const user = this.currentUser();
    return booking?.owner_id === user?.id;
  });

  /**
   * Timeline steps with completion status and metadata
   */
  readonly timelineSteps: Signal<TimelineStep[]> = computed(() => {
    const booking = this.booking();
    if (!booking) return [];

    const steps: TimelineStep[] = [
      // 1. Booking Created
      {
        key: 'booking_created',
        label: 'Reserva Creada',
        description: 'El locatario solicitó la reserva',
        completed: !!booking.created_at,
        timestamp: booking.created_at || null,
        actor: this.renterName(),
        actorId: booking.renter_id,
      },

      // 2. Payment Locked
      {
        key: 'payment_locked',
        label: 'Pago Bloqueado',
        description: 'Fondos bloqueados en wallet o tarjeta autorizada',
        completed: !!booking.paid_at || !!booking.wallet_lock_id,
        timestamp: booking.paid_at || booking.wallet_charged_at || null,
        actor: this.renterName(),
        actorId: booking.renter_id,
      },

      // 3. Car Delivered/Picked Up
      {
        key: 'car_delivered',
        label: 'Vehículo Entregado',
        description: 'Check-in completado, alquiler iniciado',
        completed:
          booking.status === 'in_progress' ||
          booking.status === 'completed' ||
          !!booking.returned_at,
        timestamp: booking.start_at,
        actor: 'Ambas partes',
        actorId: null,
      },

      // 4. Car Returned
      {
        key: 'car_returned',
        label: 'Vehículo Devuelto',
        description: 'Auto devuelto físicamente',
        completed: !!booking.returned_at,
        timestamp: booking.returned_at || null,
        actor: booking.returned_at
          ? this.isRenter()
            ? this.renterName()
            : this.ownerName()
          : null,
        actorId: booking.returned_at ? booking.renter_id : null,
        requiresAction: !booking.returned_at && booking.status === 'in_progress' && this.isRenter(),
        actionLabel: 'Marcar como devuelto',
        actionDescription: 'Confirmar que devolviste el vehículo al propietario',
      },

      // 5. Owner Confirms Return
      {
        key: 'owner_confirms',
        label: 'Propietario Confirma',
        description: booking.owner_reported_damages
          ? `Confirmado con daños reportados ($${booking.owner_damage_amount || 0} USD)`
          : 'Vehículo recibido en buenas condiciones',
        completed: !!booking.owner_confirmed_delivery,
        timestamp: booking.owner_confirmation_at || null,
        actor: this.ownerName(),
        actorId: booking.owner_id || null,
        requiresAction:
          !!booking.returned_at && !booking.owner_confirmed_delivery && this.isOwner(),
        actionLabel: 'Confirmar recepción',
        actionDescription: 'Confirmar que recibiste el vehículo (con o sin daños)',
        metadata: booking.owner_reported_damages
          ? {
              damageAmount: booking.owner_damage_amount || 0,
              damageDescription: booking.owner_damage_description || undefined,
            }
          : undefined,
      },

      // 6. Damage Report (conditional)
      {
        key: 'damage_report',
        label: 'Reporte de Daños',
        description: booking.owner_damage_description || 'No se reportaron daños',
        completed: true, // Always shown if we reach this step
        timestamp: booking.owner_confirmation_at || null,
        actor: this.ownerName(),
        actorId: booking.owner_id || null,
        isConditional: true, // Only show if damages reported
        metadata: {
          damageAmount: booking.owner_damage_amount || 0,
          damageDescription: booking.owner_damage_description || undefined,
        },
      },

      // 7. Renter Confirms Payment
      {
        key: 'renter_confirms',
        label: 'Locatario Confirma',
        description: 'Confirma liberar el pago al propietario',
        completed: !!booking.renter_confirmed_payment,
        timestamp: booking.renter_confirmation_at || null,
        actor: this.renterName(),
        actorId: booking.renter_id,
        requiresAction:
          !!booking.returned_at && !booking.renter_confirmed_payment && this.isRenter(),
        actionLabel: 'Confirmar pago',
        actionDescription: 'Autorizar la liberación de fondos al propietario',
      },

      // 8. Funds Released
      {
        key: 'funds_released',
        label: 'Fondos Liberados',
        description: 'Pago transferido al propietario y depósito devuelto',
        completed: !!booking.funds_released_at,
        timestamp: booking.funds_released_at || null,
        actor: 'Sistema automático',
        actorId: null,
      },

      // 9. Completed
      {
        key: 'completed',
        label: 'Completado',
        description: 'Reserva finalizada exitosamente',
        completed: booking.status === 'completed',
        timestamp: booking.funds_released_at || booking.updated_at || null,
        actor: null,
        actorId: null,
      },
    ];

    // Filter out conditional steps if not applicable
    return steps.filter((step) => {
      if (step.key === 'damage_report') {
        return booking.owner_reported_damages === true;
      }
      return true;
    });
  });

  /**
   * Current active step index
   */
  readonly currentStepIndex = computed(() => {
    const steps = this.timelineSteps();
    let lastCompletedIndex = -1;
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i].completed) {
        lastCompletedIndex = i;
        break;
      }
    }
    return lastCompletedIndex + 1; // Next step is current
  });

  /**
   * Is timeline complete
   */
  readonly isTimelineComplete = computed(() => {
    const booking = this.booking();
    return booking?.status === 'completed' && !!booking.funds_released_at;
  });

  /**
   * Pending action message for current user
   */
  readonly pendingActionMessage = computed(() => {
    const booking = this.booking();
    const isOwner = this.isOwner();
    const isRenter = this.isRenter();

    if (booking?.completion_status === 'pending_owner' && isOwner) {
      return 'Esperando tu confirmación como propietario';
    }
    if (booking?.completion_status === 'pending_renter' && isRenter) {
      return 'Esperando tu confirmación como locatario';
    }
    if (booking?.completion_status === 'pending_both') {
      if (isOwner && !booking.owner_confirmed_delivery) {
        return 'Esperando tu confirmación como propietario';
      }
      if (isRenter && !booking.renter_confirmed_payment) {
        return 'Esperando tu confirmación como locatario';
      }
    }
    return null;
  });

  // ==================== PUBLIC METHODS ====================

  /**
   * Format timestamp to human readable date
   */
  formatTimestamp(timestamp: string | null): string {
    if (!timestamp) return 'Pendiente';

    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  /**
   * Handle action button click
   */
  handleAction(step: TimelineStep): void {
    const booking = this.booking();
    if (!booking) return;

    let action: 'owner_confirm' | 'renter_confirm' | 'mark_returned';

    switch (step.key) {
      case 'car_returned':
        action = 'mark_returned';
        break;
      case 'owner_confirms':
        action = 'owner_confirm';
        break;
      case 'renter_confirms':
        action = 'renter_confirm';
        break;
      default:
        return;
    }

    this.confirmationRequested.emit({
      action,
      bookingId: booking.id,
    });
  }

  /**
   * Check if step is completed
   */
  isStepCompleted(index: number): boolean {
    const currentIndex = this.currentStepIndex();
    return index < currentIndex;
  }

  /**
   * Check if step is current
   */
  isStepCurrent(index: number): boolean {
    return index === this.currentStepIndex();
  }

  /**
   * Check if step is upcoming
   */
  isStepUpcoming(index: number): boolean {
    const currentIndex = this.currentStepIndex();
    return index > currentIndex;
  }
}
