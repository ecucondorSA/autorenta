import type { Booking, BookingStatus } from '../models';

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
    pending: ['confirmed', 'cancelled', 'expired'],
    // Estado intermedio cuando falta el pago (similar a pending)
    pending_payment: ['confirmed', 'cancelled', 'expired'],
    confirmed: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: [], // Estado final, no se puede cambiar
    cancelled: [], // Estado final
    expired: [], // Estado final
    // No show es un estado final (el locatario no se presentó)
    no_show: [],
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
      reason: 'El check-in debe realizarse antes de que comience el alquiler',
    };
  }

  return { allowed: true };
}

/**
 * Verifica si un booking está en un estado que permite check-out
 */
export function canPerformCheckOut(booking: Booking): {
  allowed: boolean;
  reason?: string;
} {
  if (booking.status !== 'in_progress') {
    return {
      allowed: false,
      reason: `El check-out solo está disponible para bookings en progreso. Estado actual: ${booking.status}`,
    };
  }

  // Verificar que el alquiler haya comenzado
  const startDate = new Date(booking.start_at);
  const now = new Date();

  if (now < startDate) {
    return {
      allowed: false,
      reason: 'El check-out solo está disponible después de que comience el alquiler',
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
      description: 'El locatario no se presentó para el inicio del alquiler',
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






