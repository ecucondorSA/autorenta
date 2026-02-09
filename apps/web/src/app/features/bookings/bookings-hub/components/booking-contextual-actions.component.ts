import { Component, ChangeDetectionStrategy, input, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import type { Booking } from '@core/models';
import { BookingUiService } from '@core/services/bookings/booking-ui.service';
import { addIcons } from 'ionicons';
import {
  arrowForwardOutline,
  chatbubbleEllipsesOutline,
  documentTextOutline,
  warningOutline,
  callOutline,
  navigateOutline,
  cameraOutline,
  cardOutline,
  shieldCheckmarkOutline,
  starOutline,
} from 'ionicons/icons';
import type { BookingRole } from '../bookings-hub.types';

interface ContextualAction {
  id: string;
  label: string;
  icon: string;
  link: string[];
  query?: Record<string, string>;
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
}

/**
 * BookingContextualActionsComponent — Dynamic CTA panel
 *
 * Based on the booking status and role, renders:
 * - 1 primary CTA button (prominent, colored)
 * - 2-3 secondary action chips (smaller, ghost style)
 *
 * This is the "what should I do next?" answer.
 */
@Component({
  selector: 'app-booking-contextual-actions',
  standalone: true,
  imports: [RouterLink, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Primary CTA -->
    @if (primaryAction()) {
      <a
        [routerLink]="primaryAction()!.link"
        [queryParams]="primaryAction()!.query ?? {}"
        class="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97]"
        [class]="primaryButtonClass()"
      >
        <ion-icon [name]="primaryAction()!.icon" class="text-base"></ion-icon>
        {{ primaryAction()!.label }}
        <ion-icon name="arrow-forward-outline" class="text-sm"></ion-icon>
      </a>
    }

    <!-- Secondary Actions Row -->
    @if (secondaryActions().length > 0) {
      <div class="flex gap-2 mt-1">
        @for (action of secondaryActions(); track action.id) {
          <a
            [routerLink]="action.link"
            [queryParams]="action.query ?? {}"
            class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
            [class]="secondaryButtonClass(action)"
          >
            <ion-icon [name]="action.icon" class="text-sm"></ion-icon>
            {{ action.label }}
          </a>
        }
      </div>
    }
  `,
})
export class BookingContextualActionsComponent {
  private readonly bookingUi = inject(BookingUiService);

  booking = input.required<Booking>();
  role = input.required<BookingRole>();

  constructor() {
    addIcons({
      arrowForwardOutline,
      chatbubbleEllipsesOutline,
      documentTextOutline,
      warningOutline,
      callOutline,
      navigateOutline,
      cameraOutline,
      cardOutline,
      shieldCheckmarkOutline,
      starOutline,
    });
  }

  readonly primaryAction = computed<ContextualAction | null>(() => {
    const b = this.booking();
    const r = this.role();
    if (!b) return null;

    switch (b.status) {
      case 'pending':
      case 'pending_payment':
        return r === 'renter'
          ? {
              id: 'pay',
              label: 'Completar Pago',
              icon: 'card-outline',
              link: ['/bookings/request'],
              query: { bookingId: b.id },
              variant: 'primary',
            }
          : {
              id: 'review',
              label: 'Revisar Solicitud',
              icon: 'shield-checkmark-outline',
              link: ['/bookings/pending-approval'],
              variant: 'primary',
            };

      case 'pending_owner_approval':
        return r === 'owner'
          ? {
              id: 'approve',
              label: 'Aprobar Solicitud',
              icon: 'shield-checkmark-outline',
              link: ['/bookings/pending-approval'],
              variant: 'primary',
            }
          : null;

      case 'confirmed':
        return r === 'renter'
          ? {
              id: 'checkin',
              label: 'Iniciar Check-in',
              icon: 'camera-outline',
              link: ['/bookings', b.id, 'check-in'],
              variant: 'primary',
            }
          : {
              id: 'owner-checkin',
              label: 'Gestionar Entrega',
              icon: 'navigate-outline',
              link: ['/bookings', b.id, 'owner-check-in'],
              variant: 'primary',
            };

      case 'in_progress':
        return {
          id: 'active',
          label: 'Panel de Viaje',
          icon: 'navigate-outline',
          link: ['/bookings', b.id, 'active'],
          variant: 'primary',
        };

      case 'pending_return':
      case 'pending_review':
        return r === 'renter'
          ? {
              id: 'checkout',
              label: 'Iniciar Devolución',
              icon: 'camera-outline',
              link: ['/bookings', b.id, 'check-out'],
              variant: 'primary',
            }
          : {
              id: 'owner-checkout',
              label: 'Inspeccionar Vehículo',
              icon: 'shield-checkmark-outline',
              link: ['/bookings', b.id, 'owner-check-out'],
              variant: 'primary',
            };

      case 'completed':
        return {
          id: 'review',
          label: 'Dejar Reseña',
          icon: 'star-outline',
          link: ['/bookings', b.id],
          variant: 'primary',
        };

      default:
        return {
          id: 'detail',
          label: 'Ver Detalle',
          icon: 'arrow-forward-outline',
          link: ['/bookings', b.id],
          variant: 'primary',
        };
    }
  });

  readonly secondaryActions = computed<ContextualAction[]>(() => {
    const b = this.booking();
    const r = this.role();
    if (!b) return [];

    const actions: ContextualAction[] = [];

    // Chat is always available for active bookings
    const activeStatuses = [
      'confirmed',
      'in_progress',
      'pending_return',
      'pending_review',
      'pending',
      'pending_payment',
      'pending_owner_approval',
    ];
    if (activeStatuses.includes(b.status)) {
      const chatTarget = r === 'renter' ? b.owner_id : (b.renter_id ?? b.user_id);
      actions.push({
        id: 'chat',
        label: r === 'renter' ? 'Chat Propietario' : 'Chat Arrendatario',
        icon: 'chatbubble-ellipses-outline',
        link: ['/messages/chat'],
        query: { bookingId: b.id, userId: chatTarget ?? '' },
        variant: 'ghost',
      });
    }

    // Contract view for active bookings
    if (['confirmed', 'in_progress', 'pending_return', 'completed'].includes(b.status)) {
      actions.push({
        id: 'contract',
        label: 'Ver Contrato',
        icon: 'document-text-outline',
        link: ['/bookings', b.id],
        query: { tab: 'contract' },
        variant: 'ghost',
      });
    }

    // Report incident for active trips
    if (b.status === 'in_progress') {
      actions.push({
        id: 'incident',
        label: 'Reportar',
        icon: 'warning-outline',
        link: ['/bookings', b.id, 'disputes'],
        variant: 'danger',
      });
    }

    return actions.slice(0, 3); // Max 3 secondary actions
  });

  primaryButtonClass(): string {
    const action = this.primaryAction();
    if (!action) return '';

    switch (action.variant) {
      case 'primary':
        return 'bg-slate-900 text-white hover:bg-slate-800';
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700';
      default:
        return 'bg-slate-100 text-slate-700 hover:bg-slate-200';
    }
  }

  secondaryButtonClass(action: ContextualAction): string {
    switch (action.variant) {
      case 'danger':
        return 'bg-red-50 text-red-700 border border-red-100';
      case 'ghost':
        return 'bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-100';
    }
  }
}
