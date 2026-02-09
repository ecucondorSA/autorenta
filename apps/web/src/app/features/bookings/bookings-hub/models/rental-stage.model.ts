/**
 * Rental Stage Model — Defines the 5 phases of a rental lifecycle
 *
 * Maps booking statuses to visual stepper stages for the
 * operational dashboard. Each stage has a semantic meaning
 * independent of the underlying DB status complexity.
 */

export type RentalStageId = 'pre-checkin' | 'checkin' | 'en-viaje' | 'checkout' | 'post-checkout';
export type RentalStageStatus = 'completed' | 'active' | 'locked';

export interface RentalStage {
  id: RentalStageId;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  status: RentalStageStatus;
}

/**
 * Map a booking status to the current active stage index (0-4).
 * Returns -1 for terminal/history statuses.
 */
export function getActiveStageIndex(bookingStatus: string): number {
  switch (bookingStatus) {
    // Stage 0: Pre-checkin (payment, approval, confirmation)
    case 'pending':
    case 'pending_payment':
    case 'pending_approval':
    case 'pending_owner_approval':
      return 0;

    // Stage 1: Check-in (confirmed, ready to pick up)
    case 'confirmed':
      return 1;

    // Stage 2: En Viaje (trip in progress)
    case 'in_progress':
      return 2;

    // Stage 3: Checkout (return, inspection)
    case 'pending_return':
    case 'returned':
    case 'inspected_good':
    case 'damage_reported':
    case 'pending_review':
      return 3;

    // Stage 4: Post-checkout (completed, resolved)
    case 'completed':
    case 'resolved':
      return 4;

    // Dispute states map to whatever phase they interrupted
    case 'dispute':
    case 'disputed':
    case 'pending_dispute_resolution':
      return 3; // Disputes happen post-checkout

    // Terminal/cancelled — no active stage
    case 'cancelled':
    case 'cancelled_renter':
    case 'cancelled_owner':
    case 'cancelled_system':
    case 'rejected':
    case 'expired':
    case 'no_show':
    case 'payment_validation_failed':
      return -1;

    default:
      return 0;
  }
}

/**
 * Build the 5 stages with their current status relative to a booking.
 */
export function buildRentalStages(bookingStatus: string): RentalStage[] {
  const activeIndex = getActiveStageIndex(bookingStatus);
  const isTerminal = activeIndex === -1;

  const stages: Omit<RentalStage, 'status'>[] = [
    {
      id: 'pre-checkin',
      label: 'Pre Check-in',
      shortLabel: 'Pre',
      icon: 'document-text-outline',
      description: 'Pago y confirmación',
    },
    {
      id: 'checkin',
      label: 'Check-in',
      shortLabel: 'Check-in',
      icon: 'log-in-outline',
      description: 'Retiro del vehículo',
    },
    {
      id: 'en-viaje',
      label: 'En Viaje',
      shortLabel: 'Viaje',
      icon: 'car-sport-outline',
      description: 'Viaje en curso',
    },
    {
      id: 'checkout',
      label: 'Check-out',
      shortLabel: 'Check-out',
      icon: 'log-out-outline',
      description: 'Devolución e inspección',
    },
    {
      id: 'post-checkout',
      label: 'Post Check-out',
      shortLabel: 'Fin',
      icon: 'checkmark-circle-outline',
      description: 'Finalización y reseña',
    },
  ];

  return stages.map((stage, index) => ({
    ...stage,
    status: isTerminal
      ? ('locked' as RentalStageStatus)
      : index < activeIndex
        ? ('completed' as RentalStageStatus)
        : index === activeIndex
          ? ('active' as RentalStageStatus)
          : ('locked' as RentalStageStatus),
  }));
}

/**
 * Get a human-readable action hint for the current stage.
 */
export function getStageActionHint(bookingStatus: string, role: 'renter' | 'owner'): string {
  switch (bookingStatus) {
    case 'pending':
    case 'pending_payment':
      return role === 'renter'
        ? 'Completá el pago para confirmar'
        : 'Esperando pago del arrendatario';
    case 'pending_owner_approval':
      return role === 'owner'
        ? 'Revisá y aprobá la solicitud'
        : 'Esperando aprobación del propietario';
    case 'confirmed':
      return role === 'renter' ? 'Preparate para el retiro' : 'Preparate para entregar el vehículo';
    case 'in_progress':
      return role === 'renter' ? 'Viaje en curso — disfrutá' : 'El arrendatario tiene tu vehículo';
    case 'pending_return':
      return role === 'renter' ? 'Hora de devolver el vehículo' : 'Esperando devolución';
    case 'pending_review':
      return role === 'renter' ? 'Confirmá la devolución' : 'Confirmá que todo esté en orden';
    case 'completed':
      return 'Renta finalizada con éxito';
    default:
      return '';
  }
}
