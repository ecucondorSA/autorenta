import type { Booking, BookingStatus } from '@core/models';

/**
 * BookingFlowHelpers
 *
 * Utilidades y helpers para trabajar con el flujo de booking.
 * Funciones puras sin dependencias de servicios.
 */

/**
 * Valida si una transición de estado es permitida
 */
export function isValidStatusTransition(
  from: BookingStatus,
  to: BookingStatus,
): { valid: boolean; reason?: string } {
  const validTransitions: Record<BookingStatus, BookingStatus[]> = {
    pending: [
      'confirmed',
      'cancelled',
      'expired',
      'rejected',
      'cancelled_renter',
      'cancelled_owner',
      'cancelled_system',
    ],
    pending_payment: [
      'confirmed',
      'cancelled',
      'expired',
      'cancelled_renter',
      'cancelled_owner',
      'cancelled_system',
      'payment_validation_failed',
    ],
    pending_approval: [
      'pending_payment',
      'confirmed',
      'cancelled',
      'rejected',
      'cancelled_renter',
      'cancelled_owner',
      'cancelled_system',
    ],
    confirmed: [
      'in_progress',
      'cancelled',
      'cancelled_renter',
      'cancelled_owner',
      'cancelled_system',
    ],
    in_progress: [
      'pending_review',
      'completed',
      'cancelled',
      'cancelled_renter',
      'cancelled_owner',
      'cancelled_system',
      'returned',
    ],
    pending_review: [
      'completed',
      'disputed',
      'cancelled',
      'cancelled_renter',
      'cancelled_owner',
      'cancelled_system',
    ],
    disputed: ['resolved', 'cancelled_system'],
    resolved: ['completed'], // Resolved leads to completed
    completed: [],
    cancelled: [],
    expired: [],
    no_show: [],
    rejected: [],
    // pending_dispute_resolution is redundant with 'disputed' in the new model, so it can be mapped to it if needed
    pending_dispute_resolution: ['disputed'],
    cancelled_renter: [],
    cancelled_owner: [],
    cancelled_system: [],
    payment_validation_failed: ['pending_payment', 'cancelled', 'cancelled_system'],
    returned: ['inspected_good', 'damage_reported', 'completed'],
    inspected_good: ['completed'],
    damage_reported: ['disputed', 'completed'],
  };

  const allowed = validTransitions[from]?.includes(to) ?? false;

  if (!allowed) {
    return {
      valid: false,
      reason: `No se puede cambiar de "${from}" a "${to}". Transiciones permitidas: ${validTransitions[from]?.join(', ') || 'ninguna'}`,
    };
  }

  return { valid: true };
}

/**
 * Verifica si un booking está en un estado que permite check-in
 */
export function canPerformCheckIn(booking: Booking): {
  allowed: boolean;
  reason?: string;
} {
  if (booking.status !== 'confirmed') {
    return {
      allowed: false,
      reason: `El check-in solo está disponible para bookings confirmados. Estado actual: ${booking.status}`,
    };
  }

  // Verificar que las fechas sean válidas
  const startDate = new Date(booking.start_at);
  const now = new Date();
  const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Permitir check-in hasta 2 horas antes del inicio
  if (hoursUntilStart < -2) {
    return {
      allowed: false,
      reason: 'El check-in debe realizarse antes de que comience la reserva',
    };
  }

  return { allowed: true };
}

/**
 * Verifica si un booking está en un estado que permite check-out
 * Nota: Esta función es permisiva con los estados porque la validación real
 * se hace en el componente check-out basada en las inspecciones completadas.
 * El effectiveStatus (basado en inspecciones) puede diferir del booking.status.
 */
export function canPerformCheckOut(booking: Booking): {
  allowed: boolean;
  reason?: string;
} {
  // Estados donde el viaje podría estar activo (check-in hecho pero no check-out)
  const activeStates: BookingStatus[] = [
    'in_progress',
    'confirmed',
    'pending_review',
    'completed',
  ];

  if (!activeStates.includes(booking.status)) {
    return {
      allowed: false,
      reason: `El check-out no está disponible para reservas en estado: ${booking.status}`,
    };
  }

  // Verificar que el alquiler haya comenzado
  const startDate = new Date(booking.start_at);
  const now = new Date();

  if (now < startDate) {
    return {
      allowed: false,
      reason: 'El check-out solo está disponible después de que comience la reserva',
    };
  }

  return { allowed: true };
}

/**
 * Calcula el tiempo restante para una acción
 */
export function getTimeRemaining(targetDate: Date | string): {
  days: number;
  hours: number;
  minutes: number;
  isOverdue: boolean;
  formatted: string;
} {
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  const isOverdue = diff < 0;
  const absDiff = Math.abs(diff);

  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

  let formatted = '';
  if (isOverdue) {
    formatted = `Hace ${days > 0 ? `${days}d ` : ''}${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
  } else {
    formatted = `${days > 0 ? `${days}d ` : ''}${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
  }

  return {
    days,
    hours,
    minutes,
    isOverdue,
    formatted: formatted.trim() || '0m',
  };
}

/**
 * Obtiene el estado visual de un booking para UI
 */
export function getBookingStatusDisplay(status: BookingStatus): {
  label: string;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'medium';
  icon: string;
  description: string;
} {
  const statusMap: Record<
    BookingStatus,
    {
      label: string;
      color: 'primary' | 'success' | 'warning' | 'danger' | 'medium';
      icon: string;
      description: string;
    }
  > = {
    pending: {
      label: 'Pendiente',
      color: 'warning',
      icon: '⏳',
      description: 'Esperando aprobación del locador',
    },
    pending_approval: {
      label: 'Pendiente de Aprobación',
      color: 'warning',
      icon: '⏳',
      description: 'Esperando aprobación del locador',
    },
    confirmed: {
      label: 'Confirmada',
      color: 'success',
      icon: '✅',
      description: 'Reserva confirmada. Preparate para el check-in',
    },
    in_progress: {
      label: 'En Curso',
      color: 'primary',
      icon: '🚗',
      description: 'Alquiler activo',
    },
    completed: {
      label: 'Completada',
      color: 'success',
      icon: '🎉',
      description: 'Reserva finalizada exitosamente',
    },
    cancelled: {
      label: 'Cancelada',
      color: 'danger',
      icon: '❌',
      description: 'Esta reserva fue cancelada',
    },
    expired: {
      label: 'Expirada',
      color: 'danger',
      icon: '⏰',
      description: 'La reserva expiró sin pago',
    },
    pending_payment: {
      label: 'Pendiente de Pago',
      color: 'warning',
      icon: '💳',
      description: 'Esperando que el locatario complete el pago',
    },
    no_show: {
      label: 'No Presentado',
      color: 'danger',
      icon: '🚫',
      description: 'El locatario no se presentó para el inicio de la reserva',
    },
    rejected: {
      label: 'Rechazada',
      color: 'danger',
      icon: '❌',
      description: 'La solicitud fue rechazada por el dueño',
    },
    pending_dispute_resolution: {
      label: 'En Disputa',
      color: 'danger',
      icon: '⚖️',
      description: 'El caso está siendo revisado por soporte',
    },
    pending_review: {
      label: 'En Revisión Final',
      color: 'warning',
      icon: '🔍',
      description: 'Esperando confirmación post-reserva o reporte de incidentes',
    },
    disputed: {
      label: 'En Disputa',
      color: 'danger',
      icon: '⚖️',
      description: 'Hay una disputa activa. Caso en revisión.',
    },
    resolved: {
      label: 'Disputa Resuelta',
      color: 'success',
      icon: '✅',
      description: 'Disputa resuelta. Fondos en proceso de liberación.',
    },
    cancelled_renter: {
      label: 'Cancelada por Locatario',
      color: 'danger',
      icon: '🚫',
      description: 'La reserva fue cancelada por el locatario',
    },
    cancelled_owner: {
      label: 'Cancelada por Anfitrión',
      color: 'danger',
      icon: '🚫',
      description: 'La reserva fue cancelada por el anfitrión',
    },
    cancelled_system: {
      label: 'Cancelada por Sistema',
      color: 'danger',
      icon: '⛔',
      description: 'La reserva fue cancelada automáticamente por el sistema',
    },
    payment_validation_failed: {
      label: 'Error de Pago',
      color: 'danger',
      icon: '💳',
      description: 'El pago no pudo ser validado. Por favor, intenta nuevamente.',
    },
    returned: {
      label: 'Vehículo Devuelto',
      color: 'primary',
      icon: '🔄',
      description: 'El vehículo ha sido devuelto. Pendiente de inspección.',
    },
    inspected_good: {
      label: 'Inspección OK',
      color: 'success',
      icon: '✅',
      description: 'Inspección completada sin daños. Reserva finalizada.',
    },
    damage_reported: {
      label: 'Daño Reportado',
      color: 'danger',
      icon: '⚠️',
      description: 'Se reportaron daños durante la inspección.',
    },
  };

  return (
    statusMap[status] || {
      label: status,
      color: 'medium',
      icon: '❓',
      description: '',
    }
  );
}

/**
 * Verifica si un booking puede recibir reseñas
 */
export function canLeaveReview(
  booking: Booking,
  completedDate?: Date | string,
): {
  canReview: boolean;
  reason?: string;
  daysRemaining?: number;
} {
  if (booking.status !== 'completed') {
    return {
      canReview: false,
      reason: 'Solo se pueden dejar reseñas para bookings completados',
    };
  }

  const completed = completedDate
    ? typeof completedDate === 'string'
      ? new Date(completedDate)
      : completedDate
    : booking.updated_at
      ? new Date(booking.updated_at)
      : null;

  if (!completed) {
    return {
      canReview: false,
      reason: 'No se puede determinar la fecha de finalización',
    };
  }

  const now = new Date();
  const daysSinceCompleted = Math.floor(
    (now.getTime() - completed.getTime()) / (1000 * 60 * 60 * 24),
  );
  const daysRemaining = 14 - daysSinceCompleted;

  if (daysSinceCompleted > 14) {
    return {
      canReview: false,
      reason: 'El período de reseñas expiró (14 días después de la finalización)',
      daysRemaining: 0,
    };
  }

  return {
    canReview: true,
    daysRemaining: Math.max(0, daysRemaining),
  };
}

/**
 * Calcula el porcentaje de completitud del flujo de booking
 */
export function getBookingFlowProgress(booking: Booking): {
  percentage: number;
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
} {
  const steps: Array<{ status: BookingStatus; label: string }> = [
    { status: 'pending', label: 'Solicitud Enviada' },
    { status: 'confirmed', label: 'Confirmada' },
    { status: 'in_progress', label: 'En Curso' },
    { status: 'completed', label: 'Completada' },
  ];

  const currentIndex = steps.findIndex((s) => s.status === booking.status);
  const currentStep = currentIndex >= 0 ? currentIndex + 1 : 0;
  const totalSteps = steps.length;
  const percentage = Math.round((currentStep / totalSteps) * 100);
  const stepLabel = currentIndex >= 0 ? steps[currentIndex].label : 'Desconocido';

  return {
    percentage,
    currentStep,
    totalSteps,
    stepLabel,
  };
}

/**
 * Formatea el monto de ganancias del locador (85% del total)
 */
export function formatOwnerEarnings(totalAmount: number): {
  ownerAmount: number;
  platformFee: number;
  ownerPercentage: number;
  platformPercentage: number;
  formatted: {
    owner: string;
    platform: string;
    total: string;
  };
} {
  const OWNER_SPLIT = 0.85;
  const PLATFORM_SPLIT = 0.15;

  const ownerAmount = totalAmount * OWNER_SPLIT;
  const platformFee = totalAmount * PLATFORM_SPLIT;

  return {
    ownerAmount: Math.round(ownerAmount * 100) / 100,
    platformFee: Math.round(platformFee * 100) / 100,
    ownerPercentage: OWNER_SPLIT * 100,
    platformPercentage: PLATFORM_SPLIT * 100,
    formatted: {
      owner: `$${Math.round(ownerAmount).toLocaleString('es-AR')}`,
      platform: `$${Math.round(platformFee).toLocaleString('es-AR')}`,
      total: `$${Math.round(totalAmount).toLocaleString('es-AR')}`,
    },
  };
}
