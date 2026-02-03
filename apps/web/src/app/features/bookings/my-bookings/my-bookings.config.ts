export interface StatusConfig {
  label: string;
  labelShort: string;
  hint: string;
  icon: string;
  filterLabel: string;
  bannerClass: string;
  badgeClass: string;
  cardClass: string;
  borderClass: string;
  iconBgClass: string;
  badgeCompactClass: string;
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    label: 'Pendiente de pago',
    labelShort: 'Pendiente',
    hint: 'Completá el checkout para confirmar tu reserva.',
    icon: '⏳',
    filterLabel: 'Pendientes',
    bannerClass: 'status-banner--pending',
    badgeClass: 'badge-warning',
    cardClass: 'booking-card--pending',
    borderClass: 'border-l-warning-500',
    iconBgClass: 'bg-warning-bg',
    badgeCompactClass: 'bg-warning-bg text-warning-text',
  },
  pending_review: {
    label: 'En revisión',
    labelShort: 'En revisión',
    hint: 'El auto fue devuelto. Confirmá la devolución para liberar los fondos.',
    icon: '🔍',
    filterLabel: 'En revisión',
    bannerClass: 'status-banner--info',
    badgeClass: 'badge-info',
    cardClass: 'booking-card--info',
    borderClass: 'border-l-info-500',
    iconBgClass: 'bg-info-bg',
    badgeCompactClass: 'bg-info-bg text-info-text',
  },
  confirmed: {
    label: 'Aprobada',
    labelShort: 'Aprobada',
    hint: 'Tu reserva fue aprobada. Coordiná el check-in con el propietario.',
    icon: '✅',
    filterLabel: 'Confirmadas',
    bannerClass: 'status-banner--success',
    badgeClass: 'badge-success',
    cardClass: 'booking-card--success',
    borderClass: 'border-l-success-500',
    iconBgClass: 'bg-success-bg',
    badgeCompactClass: 'bg-success-bg text-success-text',
  },
  in_progress: {
    label: 'En uso',
    labelShort: 'En uso',
    hint: 'Disfrutá tu viaje. Recordá devolver el auto en las condiciones acordadas.',
    icon: '🚗',
    filterLabel: 'En curso',
    bannerClass: 'status-banner--success',
    badgeClass: 'badge-info',
    cardClass: 'booking-card--success',
    borderClass: 'border-l-success-500',
    iconBgClass: 'bg-success-bg',
    badgeCompactClass: 'bg-info-bg text-info-text',
  },
  completed: {
    label: 'Finalizada',
    labelShort: 'Finalizada',
    hint: 'Gracias por viajar con nosotros.',
    icon: '🏁',
    filterLabel: 'Finalizadas',
    bannerClass: 'status-banner--neutral',
    badgeClass: 'badge-neutral',
    cardClass: 'booking-card--neutral',
    borderClass: 'border-l-border-default',
    iconBgClass: 'bg-surface-secondary',
    badgeCompactClass: 'bg-surface-secondary text-text-secondary',
  },
  cancelled: {
    label: 'Cancelada',
    labelShort: 'Cancelada',
    hint: 'Se canceló esta reserva. Podés generar una nueva cuando quieras.',
    icon: '❌',
    filterLabel: 'Canceladas',
    bannerClass: 'status-banner--danger',
    badgeClass: 'badge-danger',
    cardClass: 'booking-card--danger',
    borderClass: 'border-l-error-500',
    iconBgClass: 'bg-error-bg',
    badgeCompactClass: 'bg-error-bg text-error-text',
  },
  expired: {
    label: 'Vencida',
    labelShort: 'Vencida',
    hint: 'La fecha de alquiler ya pasó sin completar el pago.',
    icon: '⏱️',
    filterLabel: 'Vencidas',
    bannerClass: 'status-banner--danger',
    badgeClass: 'badge-danger',
    cardClass: 'booking-card--danger',
    borderClass: 'border-l-error-500',
    iconBgClass: 'bg-error-bg',
    badgeCompactClass: 'bg-error-bg text-error-text',
  },
};

export const DEFAULT_STATUS_CONFIG: StatusConfig = {
  label: 'Desconocido',
  labelShort: 'Desconocido',
  hint: '',
  icon: 'ℹ️',
  filterLabel: 'Otros',
  bannerClass: '',
  badgeClass: 'badge-neutral',
  cardClass: 'booking-card--neutral',
  borderClass: 'border-l-border-default',
  iconBgClass: 'bg-surface-secondary',
  badgeCompactClass: 'bg-surface-secondary text-text-secondary',
};

export type BookingStatusFilter =
  | 'all'
  | 'pending'
  | 'pending_review'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface BookingSection {
  id: string;
  title: string;
  icon: string;
  expanded: boolean;
  priority: number;
  statuses: string[];
  accentClass: string;
}

export const STATUS_FILTERS: readonly BookingStatusFilter[] = [
  'all',
  'pending',
  'pending_review',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export const INITIAL_SECTIONS: BookingSection[] = [
  {
    id: 'action-required',
    title: 'Requieren Acción',
    icon: '⚠️',
    expanded: true,
    priority: 1,
    statuses: ['pending', 'pending_review'],
    accentClass: 'section-accent section-accent--pending',
  },
  {
    id: 'active',
    title: 'Activas',
    icon: '🚀',
    expanded: true,
    priority: 2,
    statuses: ['confirmed', 'in_progress'],
    accentClass: 'section-accent section-accent--active',
  },
  {
    id: 'history',
    title: 'Historial',
    icon: '📋',
    expanded: false,
    priority: 3,
    statuses: ['completed', 'cancelled', 'expired'],
    accentClass: 'section-accent section-accent--history',
  },
];
