/**
 * BookingUiService — SINGLE SOURCE OF TRUTH for booking UI transformations
 *
 * Project "Vellum" — Booking Experience Overhaul
 *
 * Replaces duplicated status→text/color/icon maps across:
 *   - booking-utils.ts (BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS)
 *   - booking-flow-helpers.ts (getBookingStatusDisplay)
 *   - booking-flow.service.ts (getBookingStatusInfo)
 *   - my-bookings.config.ts (STATUS_CONFIG)
 *
 * Architecture:
 *   State + Role → { label, hint, icon, color, bgClass, action }
 *
 * All output is action-oriented: the UI tells the user what to DO, not just what IS.
 */
import { Injectable, inject } from '@angular/core';
import type { Booking, BookingUiStatus } from '@core/models';
import { AuthService } from '@core/services/auth/auth.service';

// ─── Public Types ─────────────────────────────────────────────────────────────

export type BookingRole = 'renter' | 'owner' | 'unknown';
export type BookingPriority = 'urgent' | 'active' | 'info' | 'neutral';
export type BookingColorScheme = 'amber' | 'green' | 'blue' | 'red' | 'slate' | 'purple';

export interface BookingUiState {
  /** Action-oriented label: "Pagar Ahora", not "Pendiente" */
  label: string;
  /** Short label for badge: "Pagar", "En curso" */
  labelShort: string;
  /** Contextual hint: what does the user need to do? */
  hint: string;
  /** Emoji icon */
  icon: string;
  /** Ionicon name for structured icon */
  ionIcon: string;
  /** Color scheme key */
  color: BookingColorScheme;
  /** Tailwind border class for left accent */
  borderClass: string;
  /** Tailwind badge classes */
  badgeClass: string;
  /** Background class for icon container */
  iconBgClass: string;
  /** Header/banner gradient class */
  headerClass: string;
  /** Priority bucket for sorting */
  priority: BookingPriority;
  /** Primary CTA if applicable */
  primaryAction: BookingCardAction | null;
  /** Secondary actions */
  secondaryActions: BookingCardAction[];
}

export interface BookingCardAction {
  label: string;
  icon: string;
  route: string;
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
}

// ─── Color Definitions ────────────────────────────────────────────────────────

const COLORS: Record<
  BookingColorScheme,
  {
    border: string;
    badge: string;
    iconBg: string;
    header: string;
  }
> = {
  amber: {
    border: 'border-l-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-600',
    header: 'bg-gradient-to-r from-amber-500 to-amber-600',
  },
  green: {
    border: 'border-l-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-600',
    header: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
  },
  blue: {
    border: 'border-l-blue-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-100 text-blue-600',
    header: 'bg-gradient-to-r from-blue-500 to-blue-600',
  },
  red: {
    border: 'border-l-red-500',
    badge: 'bg-red-50 text-red-700 border-red-200',
    iconBg: 'bg-red-100 text-red-600',
    header: 'bg-gradient-to-r from-red-500 to-red-600',
  },
  slate: {
    border: 'border-l-slate-300',
    badge: 'bg-slate-50 text-slate-600 border-slate-200',
    iconBg: 'bg-slate-100 text-slate-500',
    header: 'bg-gradient-to-r from-slate-500 to-slate-600',
  },
  purple: {
    border: 'border-l-purple-500',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    iconBg: 'bg-purple-100 text-purple-600',
    header: 'bg-gradient-to-r from-purple-500 to-purple-600',
  },
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class BookingUiService {
  private readonly authService = inject(AuthService);

  // ─── Role Detection ────────────────────────────────────────────────────────

  getUserRole(booking: Booking): BookingRole {
    const userId = this.authService.userId();
    if (!userId) return 'unknown';
    if (booking.owner_id === userId) return 'owner';
    if (booking.renter_id === userId) return 'renter';
    return 'unknown';
  }

  // ─── Main API ──────────────────────────────────────────────────────────────

  /**
   * Get the complete UI state for a booking, context-aware by role.
   */
  getUiState(booking: Booking, roleOverride?: BookingRole): BookingUiState {
    const role = roleOverride ?? this.getUserRole(booking);
    const status = this.getEffectiveStatus(booking);
    return this.buildUiState(booking, status, role);
  }

  /**
   * Get the priority bucket for inbox grouping.
   */
  getPriority(booking: Booking, roleOverride?: BookingRole): BookingPriority {
    const role = roleOverride ?? this.getUserRole(booking);
    const status = this.getEffectiveStatus(booking);
    return this.resolvePriority(status, role, booking);
  }

  /**
   * Check if a booking has an expired-start-date scenario.
   */
  isStartDatePassed(booking: Booking): boolean {
    if (!booking.start_at) return false;
    return new Date(booking.start_at) < new Date();
  }

  /**
   * Compute effective status (handles expired derivation).
   */
  getEffectiveStatus(booking: Booking): BookingUiStatus {
    const s = booking.status;
    if ((s === 'pending_payment' || s === 'pending') && this.isStartDatePassed(booking)) {
      return 'expired';
    }
    if (s === 'pending_payment') return 'pending';
    return s as BookingUiStatus;
  }

  // ─── Internal Builders ─────────────────────────────────────────────────────

  private buildUiState(
    booking: Booking,
    status: BookingUiStatus,
    role: BookingRole,
  ): BookingUiState {
    switch (status) {
      // ── Pending / Payment ────────────────────────────────────────────────
      case 'pending':
      case 'pending_payment':
      case 'pending_deposit': {
        if (role === 'owner') {
          const isApprovalFlow = !!booking.payment_mode && booking.payment_mode === 'wallet';
          if (isApprovalFlow) {
            return this.make(status, {
              label: 'Nueva Solicitud',
              labelShort: 'Solicitud',
              hint: 'Un viajero quiere alquilar tu auto. Revisá su perfil y decidí.',
              icon: '🔔',
              ionIcon: 'notifications',
              color: 'amber',
              priority: 'urgent',
              primaryAction: {
                label: 'Revisar Solicitud',
                icon: 'eye',
                route: `/bookings/owner/${booking.id}`,
                variant: 'primary',
              },
            });
          }
          return this.make(status, {
            label: 'Esperando Pago',
            labelShort: 'Esperando',
            hint: 'El viajero aún no completó el pago.',
            icon: '⏳',
            ionIcon: 'hourglass',
            color: 'amber',
            priority: 'info',
            primaryAction: null,
          });
        }
        // Renter
        return this.make(status, {
          label: 'Completar Pago',
          labelShort: 'Pagar',
          hint: 'Completá el checkout para confirmar tu reserva.',
          icon: '💳',
          ionIcon: 'card',
          color: 'amber',
          priority: 'urgent',
          primaryAction: {
            label: 'Pagar Ahora',
            icon: 'card',
            route: `/bookings/${booking.id}`,
            variant: 'primary',
          },
        });
      }

      // ── Pending Approval ────────────────────────────────────────────────
      case 'pending_approval':
      case 'pending_owner_approval': {
        if (role === 'owner') {
          return this.make(status, {
            label: 'Aprobar Solicitud',
            labelShort: 'Aprobar',
            hint: 'Revisá el perfil del viajero y aceptá o rechazá la solicitud.',
            icon: '🔔',
            ionIcon: 'checkmark-circle',
            color: 'amber',
            priority: 'urgent',
            primaryAction: {
              label: 'Aprobar',
              icon: 'checkmark-circle',
              route: `/bookings/owner/${booking.id}`,
              variant: 'primary',
            },
            secondaryActions: [
              {
                label: 'Rechazar',
                icon: 'close-circle',
                route: `/bookings/owner/${booking.id}`,
                variant: 'danger',
              },
            ],
          });
        }
        return this.make(status, {
          label: 'Esperando Aprobación',
          labelShort: 'Esperando',
          hint: 'El propietario está revisando tu solicitud.',
          icon: '⏳',
          ionIcon: 'hourglass',
          color: 'amber',
          priority: 'info',
          primaryAction: null,
        });
      }

      // ── Confirmed ────────────────────────────────────────────────────────
      case 'confirmed': {
        if (role === 'owner') {
          return this.make(status, {
            label: 'Iniciar Entrega',
            labelShort: 'Entregar',
            hint: 'El pago está confirmado. Realizá la inspección y entregá el auto.',
            icon: '🔑',
            ionIcon: 'key',
            color: 'green',
            priority: 'urgent',
            primaryAction: {
              label: 'Iniciar Check-In',
              icon: 'checkmark-done',
              route: `/bookings/${booking.id}/owner-check-in`,
              variant: 'primary',
            },
          });
        }
        return this.make(status, {
          label: 'Viaje Confirmado',
          labelShort: 'Confirmado',
          hint: 'Todo listo. Coordiná el retiro con el propietario.',
          icon: '✅',
          ionIcon: 'checkmark-circle',
          color: 'green',
          priority: 'active',
          primaryAction: {
            label: 'Ver Pase de Viaje',
            icon: 'qr-code',
            route: `/bookings/${booking.id}`,
            variant: 'primary',
          },
        });
      }

      // ── In Progress ──────────────────────────────────────────────────────
      case 'in_progress': {
        if (role === 'owner') {
          return this.make(status, {
            label: 'Viaje en Curso',
            labelShort: 'En curso',
            hint: 'Tu auto está en viaje. Podés seguir el estado en tiempo real.',
            icon: '🚗',
            ionIcon: 'car-sport',
            color: 'blue',
            priority: 'active',
            primaryAction: {
              label: 'Ver Estado',
              icon: 'analytics',
              route: `/bookings/${booking.id}`,
              variant: 'secondary',
            },
          });
        }
        return this.make(status, {
          label: 'Viaje en Curso',
          labelShort: 'En curso',
          hint: 'Disfrutá tu viaje. Recordá devolver a tiempo.',
          icon: '🚗',
          ionIcon: 'car-sport',
          color: 'blue',
          priority: 'active',
          primaryAction: {
            label: 'Panel de Viaje',
            icon: 'navigate',
            route: `/bookings/${booking.id}/active`,
            variant: 'primary',
          },
        });
      }

      // ── Pending Return ───────────────────────────────────────────────────
      case 'pending_return': {
        if (role === 'owner') {
          return this.make(status, {
            label: 'Devolución Pendiente',
            labelShort: 'Devolver',
            hint: 'El viajero indicó que está listo para devolver el auto.',
            icon: '🔄',
            ionIcon: 'swap-horizontal',
            color: 'amber',
            priority: 'urgent',
            primaryAction: {
              label: 'Inspeccionar',
              icon: 'search',
              route: `/bookings/${booking.id}/owner-check-out`,
              variant: 'primary',
            },
          });
        }
        return this.make(status, {
          label: 'Devolución en Proceso',
          labelShort: 'Devolviendo',
          hint: 'Coordiná la devolución con el propietario.',
          icon: '🔄',
          ionIcon: 'swap-horizontal',
          color: 'amber',
          priority: 'urgent',
          primaryAction: {
            label: 'Check-Out',
            icon: 'log-out',
            route: `/bookings/${booking.id}/check-out`,
            variant: 'primary',
          },
        });
      }

      // ── Returned ─────────────────────────────────────────────────────────
      case 'returned': {
        if (role === 'owner') {
          return this.make(status, {
            label: 'Inspección Pendiente',
            labelShort: 'Inspeccionar',
            hint: 'El auto fue devuelto. Revisá su estado antes de liberar los fondos.',
            icon: '🔍',
            ionIcon: 'search',
            color: 'amber',
            priority: 'urgent',
            primaryAction: {
              label: 'Inspeccionar Auto',
              icon: 'search',
              route: `/bookings/${booking.id}/owner-check-out`,
              variant: 'primary',
            },
          });
        }
        return this.make(status, {
          label: 'Auto Devuelto',
          labelShort: 'Devuelto',
          hint: 'El propietario está inspeccionando el auto.',
          icon: '🔍',
          ionIcon: 'search',
          color: 'blue',
          priority: 'info',
          primaryAction: null,
        });
      }

      // ── Pending Review ───────────────────────────────────────────────────
      case 'pending_review': {
        if (role === 'owner') {
          return this.make(status, {
            label: 'Confirmar Devolución',
            labelShort: 'Revisar',
            hint: 'Confirmá que el auto fue devuelto en condiciones para liberar los fondos.',
            icon: '🔍',
            ionIcon: 'clipboard',
            color: 'amber',
            priority: 'urgent',
            primaryAction: {
              label: 'Confirmar',
              icon: 'checkmark-done',
              route: `/bookings/${booking.id}`,
              variant: 'primary',
            },
          });
        }
        return this.make(status, {
          label: 'En Revisión',
          labelShort: 'Revisión',
          hint: 'El propietario está revisando el auto. Los fondos se liberarán pronto.',
          icon: '🔍',
          ionIcon: 'hourglass',
          color: 'blue',
          priority: 'info',
          primaryAction: null,
        });
      }

      // ── Inspected Good ───────────────────────────────────────────────────
      case 'inspected_good':
        return this.make(status, {
          label: 'Inspección OK',
          labelShort: 'OK',
          hint: 'El auto fue inspeccionado y está todo en orden.',
          icon: '✅',
          ionIcon: 'checkmark-circle',
          color: 'green',
          priority: 'info',
          primaryAction: null,
        });

      // ── Damage Reported ──────────────────────────────────────────────────
      case 'damage_reported':
        return this.make(status, {
          label: 'Daño Reportado',
          labelShort: 'Daño',
          hint:
            role === 'owner'
              ? 'Se reportó un daño en el vehículo. Documentalo y abrí una disputa si corresponde.'
              : 'El propietario reportó un daño. Revisá los detalles.',
          icon: '⚠️',
          ionIcon: 'warning',
          color: 'red',
          priority: 'urgent',
          primaryAction: {
            label: 'Ver Reporte',
            icon: 'document-text',
            route: `/bookings/${booking.id}`,
            variant: 'primary',
          },
        });

      // ── Completed ────────────────────────────────────────────────────────
      case 'completed':
        return this.make(status, {
          label: 'Viaje Finalizado',
          labelShort: 'Finalizado',
          hint:
            role === 'owner'
              ? 'Viaje completado. Los fondos fueron transferidos a tu wallet.'
              : '¡Gran viaje! Dejá una reseña para ayudar a otros viajeros.',
          icon: '🏁',
          ionIcon: 'flag',
          color: 'green',
          priority: 'neutral',
          primaryAction:
            role === 'renter'
              ? {
                  label: 'Dejar Reseña',
                  icon: 'star',
                  route: `/bookings/${booking.id}`,
                  variant: 'primary',
                }
              : null,
        });

      // ── Cancelled variants ───────────────────────────────────────────────
      case 'cancelled':
      case 'cancelled_renter':
      case 'cancelled_owner':
      case 'cancelled_system':
        return this.make(status, {
          label: this.getCancelledLabel(status),
          labelShort: 'Cancelada',
          hint: 'Esta reserva fue cancelada.',
          icon: '❌',
          ionIcon: 'close-circle',
          color: 'red',
          priority: 'neutral',
          primaryAction: null,
        });

      // ── Dispute variants ─────────────────────────────────────────────────
      case 'dispute':
      case 'disputed':
      case 'pending_dispute_resolution':
        return this.make(status, {
          label: 'Disputa Abierta',
          labelShort: 'Disputa',
          hint: 'Hay una disputa en curso. Nuestro equipo la está revisando.',
          icon: '⚖️',
          ionIcon: 'alert-circle',
          color: 'red',
          priority: 'urgent',
          primaryAction: {
            label: 'Ver Disputa',
            icon: 'chatbubbles',
            route: `/bookings/${booking.id}/disputes`,
            variant: 'primary',
          },
        });

      // ── Terminal / Other ─────────────────────────────────────────────────
      case 'expired':
        return this.make(status, {
          label: 'Expirada',
          labelShort: 'Expirada',
          hint: 'El tiempo para completar el pago venció.',
          icon: '⏱️',
          ionIcon: 'time',
          color: 'slate',
          priority: 'neutral',
          primaryAction: null,
        });

      case 'rejected':
        return this.make(status, {
          label: 'Rechazada',
          labelShort: 'Rechazada',
          hint: 'El propietario rechazó esta solicitud.',
          icon: '🚫',
          ionIcon: 'close-circle',
          color: 'red',
          priority: 'neutral',
          primaryAction: null,
        });

      case 'no_show':
        return this.make(status, {
          label: 'No se Presentó',
          labelShort: 'No Show',
          hint: 'No se registró la presencia en la entrega.',
          icon: '👤',
          ionIcon: 'person-remove',
          color: 'red',
          priority: 'neutral',
          primaryAction: null,
        });

      case 'resolved':
        return this.make(status, {
          label: 'Resuelta',
          labelShort: 'Resuelta',
          hint: 'La disputa fue resuelta.',
          icon: '✅',
          ionIcon: 'checkmark-done',
          color: 'purple',
          priority: 'neutral',
          primaryAction: null,
        });

      case 'payment_validation_failed':
        return this.make(status, {
          label: 'Error de Pago',
          labelShort: 'Error',
          hint:
            role === 'renter'
              ? 'Hubo un problema con tu pago. Intentá nuevamente.'
              : 'El pago del viajero no pudo ser validado.',
          icon: '❗',
          ionIcon: 'alert',
          color: 'red',
          priority: 'urgent',
          primaryAction:
            role === 'renter'
              ? {
                  label: 'Reintentar Pago',
                  icon: 'card',
                  route: `/bookings/${booking.id}`,
                  variant: 'primary',
                }
              : null,
        });

      default:
        return this.make(status, {
          label: 'Estado Desconocido',
          labelShort: '—',
          hint: '',
          icon: 'ℹ️',
          ionIcon: 'information-circle',
          color: 'slate',
          priority: 'neutral',
          primaryAction: null,
        });
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private make(
    _status: BookingUiStatus | string,
    partial: Omit<
      BookingUiState,
      'borderClass' | 'badgeClass' | 'iconBgClass' | 'headerClass' | 'secondaryActions'
    > & {
      secondaryActions?: BookingCardAction[];
    },
  ): BookingUiState {
    const c = COLORS[partial.color];
    return {
      ...partial,
      borderClass: c.border,
      badgeClass: c.badge,
      iconBgClass: c.iconBg,
      headerClass: c.header,
      secondaryActions: partial.secondaryActions ?? [],
    };
  }

  private resolvePriority(
    status: BookingUiStatus,
    role: BookingRole,
    booking: Booking,
  ): BookingPriority {
    const urgentForOwner: BookingUiStatus[] = [
      'pending_approval',
      'pending_owner_approval',
      'confirmed',
      'pending_return',
      'returned',
      'pending_review',
      'damage_reported',
      'dispute',
      'disputed',
      'pending_dispute_resolution',
    ];
    const urgentForRenter: BookingUiStatus[] = [
      'pending',
      'pending_payment',
      'pending_deposit',
      'pending_return',
      'damage_reported',
      'dispute',
      'disputed',
      'pending_dispute_resolution',
      'payment_validation_failed',
    ];
    const activeStatuses: BookingUiStatus[] = ['in_progress', 'confirmed'];

    if (role === 'owner' && urgentForOwner.includes(status)) return 'urgent';
    if (role === 'renter' && urgentForRenter.includes(status)) return 'urgent';

    // Expired pending bookings are neutral
    if ((status === 'pending' || status === 'pending_payment') && this.isStartDatePassed(booking)) {
      return 'neutral';
    }

    if (activeStatuses.includes(status)) return 'active';

    // Info states (waiting on other party)
    if (status === 'pending_approval' || status === 'pending_review') return 'info';

    return 'neutral';
  }

  private getCancelledLabel(status: BookingUiStatus): string {
    switch (status) {
      case 'cancelled_renter':
        return 'Cancelada por Viajero';
      case 'cancelled_owner':
        return 'Cancelada por Propietario';
      case 'cancelled_system':
        return 'Cancelada por Sistema';
      default:
        return 'Cancelada';
    }
  }
}
