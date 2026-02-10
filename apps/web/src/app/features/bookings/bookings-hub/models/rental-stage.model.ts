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
  /** Richer action-oriented text shown in detailed/expanded stepper mode */
  detailedDescription: string;
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
      detailedDescription: 'Confirmar pago y esperar aprobación',
    },
    {
      id: 'checkin',
      label: 'Check-in',
      shortLabel: 'Check-in',
      icon: 'log-in-outline',
      description: 'Retiro del vehículo',
      detailedDescription: 'Inspeccionar, firmar y retirar el auto',
    },
    {
      id: 'en-viaje',
      label: 'En Viaje',
      shortLabel: 'Viaje',
      icon: 'car-sport-outline',
      description: 'Viaje en curso',
      detailedDescription: 'Disfrutá tu viaje con tranquilidad',
    },
    {
      id: 'checkout',
      label: 'Check-out',
      shortLabel: 'Check-out',
      icon: 'log-out-outline',
      description: 'Devolución e inspección',
      detailedDescription: 'Devolver el auto y documentar estado',
    },
    {
      id: 'post-checkout',
      label: 'Post Check-out',
      shortLabel: 'Fin',
      icon: 'checkmark-circle-outline',
      description: 'Finalización y reseña',
      detailedDescription: 'Fondos liberados, dejá tu reseña',
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
// ─── Status Badge ──────────────────────────────────────────────────

export interface StatusBadge {
  label: string;
  color: string;
}

export function getStatusBadge(status: string): StatusBadge {
  switch (status) {
    case 'pending':
    case 'pending_payment':
      return { label: 'Pendiente', color: 'bg-amber-100 text-amber-700' };
    case 'pending_owner_approval':
      return { label: 'Esperando Aprobación', color: 'bg-amber-100 text-amber-700' };
    case 'confirmed':
      return { label: 'Confirmado', color: 'bg-blue-100 text-blue-700' };
    case 'in_progress':
      return { label: 'En Curso', color: 'bg-emerald-100 text-emerald-700' };
    case 'pending_return':
    case 'pending_review':
      return { label: 'Devolución', color: 'bg-purple-100 text-purple-700' };
    case 'completed':
      return { label: 'Completado', color: 'bg-slate-100 text-slate-700' };
    default:
      return { label: 'Activo', color: 'bg-slate-100 text-slate-700' };
  }
}

// ─── Micro-Data Helpers (countdown, location, PIN) ─────────────────

export function getCountdownLabel(
  status: string,
  role: 'renter' | 'owner' = 'renter',
): string | null {
  switch (status) {
    case 'pending':
    case 'pending_payment':
      return 'Vence en';
    case 'confirmed':
      return role === 'owner' ? 'Entrega en' : 'Retiro en';
    case 'in_progress':
      return role === 'owner' ? 'Regresa en' : 'Devolver en';
    case 'pending_return':
      return 'Inspección en';
    default:
      return null;
  }
}

export function getCountdownTarget(booking: Record<string, unknown>): string | null {
  const status = (booking['status'] as string) ?? '';
  switch (status) {
    case 'pending':
    case 'pending_payment':
      return (booking['expires_at'] as string) ?? null;
    case 'confirmed':
      return (booking['start_at'] as string) ?? null;
    case 'in_progress':
      return (booking['end_at'] as string) ?? null;
    case 'pending_return':
      return (booking['auto_release_at'] as string) ?? null;
    default:
      return null;
  }
}

export function formatCountdown(targetDate: string): string {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return '00:00:00';

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  if (h > 48) {
    const days = Math.floor(h / 24);
    return `${days}d ${h % 24}h`;
  }

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function getLocationLabel(booking: Record<string, unknown>): string {
  const city = booking['car_city'] as string | undefined;
  const province = booking['car_province'] as string | undefined;
  if (city && province) return `${city}, ${province}`;
  const lat = booking['pickup_location_lat'] as number | undefined;
  const lng = booking['pickup_location_lng'] as number | undefined;
  if (lat && lng) return `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
  return 'Sin ubicación';
}

export function getSecurityPin(bookingId: string): string {
  const hash = bookingId.replace(/[^0-9]/g, '').slice(0, 4);
  return hash.padStart(4, '0');
}

export function shouldShowPin(status: string): boolean {
  return status === 'confirmed' || status === 'in_progress';
}

// ─── Stage Action Hint ─────────────────────────────────────────────

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
