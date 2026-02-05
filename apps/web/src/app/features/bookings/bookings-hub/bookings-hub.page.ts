import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import type { Booking } from '@core/models';
import { BookingsStore } from '@core/stores/bookings.store';
import { formatRelativeTime } from '@shared/utils/date.utils';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  carSportOutline,
  chevronForwardOutline,
  flashOutline,
  hourglassOutline,
  searchOutline,
  shieldCheckmarkOutline,
  walletOutline,
  notificationsOutline,
  personOutline,
  gridOutline,
  listOutline,
  filterOutline,
  addOutline,
  chatbubbleEllipsesOutline,
  timeOutline,
  receiptOutline,
  alertCircleOutline,
  locationOutline,
} from 'ionicons/icons';

import { BookingRole, BookingFilter, FilterItem, FocusCard, InsightItem, QuickAction } from './bookings-hub.types';
import { BookingsHeaderComponent } from './components/bookings-header.component';
import { BookingsFocusCardComponent } from './components/bookings-focus-card.component';
import { BookingsInsightsComponent } from './components/bookings-insights.component';
import { BookingsQuickActionsComponent } from './components/bookings-quick-actions.component';
import { BookingsListComponent } from './components/bookings-list.component';
import { getBookingDetailLink, getBookingStatusChipClass, getBookingStatusLabel } from './bookings-hub.utils';

/**
 * BookingsHubPage - V3.0 Premium Redesign
 *
 * Implements Bento Grid layouts, Cinematic headers, and Defensive UI.
 * Standardized for High-Conversion Marketplaces.
 * Refactored to use Smart/Dumb component architecture.
 */
@Component({
  standalone: true,
  selector: 'app-bookings-hub',
  imports: [
    CommonModule,
    BookingsHeaderComponent,
    BookingsFocusCardComponent,
    BookingsInsightsComponent,
    BookingsQuickActionsComponent,
    BookingsListComponent
  ],
  template: `
    <div class="min-h-screen bg-surface-base pb-32">
      <!-- 1. CINEMATIC STICKY HEADER -->
      <app-bookings-header
        [userName]="userName()"
        [role]="role()"
        (roleChange)="setRole($event)"
      ></app-bookings-header>

      <main class="container-page px-4 sm:px-6 pt-6 space-y-8 animate-fade-in">
        
        @if (loading()) {
          <!-- BENTO SKELETON -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
            <div class="h-48 bg-surface-secondary rounded-3xl col-span-1 md:col-span-2"></div>
            <div class="h-48 bg-surface-secondary rounded-3xl"></div>
            <div class="h-32 bg-surface-secondary rounded-3xl" *ngFor="let i of [1,2,3]"></div>
          </div>
        } @else {
          <!-- 2. FOCUS SECTION (Zen Priority) -->
          <app-bookings-focus-card
            [card]="focusCard()"
            [role]="role()"
          ></app-bookings-focus-card>

          <!-- 3. INSIGHTS BENTO GRID -->
          <app-bookings-insights
            [items]="insightItems()"
          ></app-bookings-insights>

          <!-- 4. QUICK ACTIONS -->
          <app-bookings-quick-actions
            [actions]="quickActions()"
          ></app-bookings-quick-actions>

          <!-- 5. RESERVAS LIST -->
          <app-bookings-list
            [bookings]="sortedBookings()"
            [filters]="filters()"
            [currentFilter]="filter()"
            [role]="role()"
            (filterChange)="setFilter($event)"
          ></app-bookings-list>
        }
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: var(--surface-base);
      }
      .animate-fade-in {
        animation: fadeIn 0.5s ease-out forwards;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingsHubPage implements OnInit, OnDestroy {
  private readonly store = inject(BookingsStore);
  private readonly authService = inject(AuthService);
  private readonly bookingsService = inject(BookingsService);

  readonly loading = this.store.loadingList;
  readonly role = signal<BookingRole>('renter');
  readonly filter = signal<BookingFilter>('all');
  readonly pendingApprovals = signal<number | null>(null);
  readonly searchTerm = signal('');
  readonly sortMode = signal<'priority' | 'date'>('priority');

  readonly myBookings = this.store.myBookings;
  readonly ownerBookings = this.store.ownerBookings;

  constructor() {
    addIcons({
      calendarOutline,
      carSportOutline,
      chevronForwardOutline,
      flashOutline,
      hourglassOutline,
      searchOutline,
      shieldCheckmarkOutline,
      walletOutline,
      notificationsOutline,
      personOutline,
      gridOutline,
      listOutline,
      filterOutline,
      addOutline,
      chatbubbleEllipsesOutline,
      timeOutline,
      receiptOutline,
      alertCircleOutline,
      locationOutline,
    });
  }

  readonly userName = computed(() => {
    const profile = inject(AuthService).session$()?.user;
    return profile?.email?.split('@')[0] || 'Usuario';
  });

  readonly insightItems = computed<InsightItem[]>(() => {
    const bookings = this.role() === 'owner' ? this.ownerBookings() : this.myBookings();
    const isOwner = this.role() === 'owner';

    return [
      {
        id: 'spent',
        label: isOwner ? 'Ingresos' : 'Gasto',
        value: this.sumLast30Days(bookings),
        type: 'money',
        icon: isOwner ? 'wallet-outline' : 'receipt-outline',
      },
      {
        id: 'total',
        label: isOwner ? 'Reservas' : 'Viajes',
        value: bookings.length,
        type: 'count',
        icon: 'car-sport-outline',
      },
      {
        id: 'next',
        label: isOwner ? 'Prox. Entrega' : 'Próximo Viaje',
        value: this.nextTripLabel(bookings),
        type: 'text',
        icon: 'calendar-outline',
      },
    ];
  });

  readonly filters = computed<FilterItem[]>(() => {
    const bookings = this.role() === 'owner' ? this.ownerBookings() : this.myBookings();
    if (this.role() === 'owner') {
      return [
        { id: 'all', label: 'Todas', count: bookings.length },
        {
          id: 'approvals',
          label: 'Aprobar',
          count: bookings.filter((b) => this.isPendingOwnerApproval(b)).length,
        },
        {
          id: 'active',
          label: 'En curso',
          count: bookings.filter((b) => this.isActive(b)).length,
        },
        {
          id: 'history',
          label: 'Historial',
          count: bookings.filter((b) => this.isHistory(b)).length,
        },
      ];
    }

    return [
      { id: 'all', label: 'Todas', count: bookings.length },
      {
        id: 'action',
        label: 'Acción',
        count: bookings.filter((b) => this.isPendingRenter(b)).length,
      },
      {
        id: 'active',
        label: 'En curso',
        count: bookings.filter((b) => this.isActive(b)).length,
      },
      {
        id: 'history',
        label: 'Historial',
        count: bookings.filter((b) => this.isHistory(b)).length,
      },
    ];
  });

  readonly focusCard = computed<FocusCard>(() => {
    const bookings = this.role() === 'owner' ? this.ownerBookings() : this.myBookings();
    const focus = this.pickFocusBooking(bookings);
    if (!focus) {
      return {
        title: 'Todo en orden',
        subtitle: 'No hay acciones urgentes por ahora.',
        badge: 'Sin urgencias',
        actionLabel: null,
        actionLink: null,
        actionQuery: null,
        toneClass: 'bg-surface-secondary text-text-secondary border-border-muted',
        icon: 'shield-checkmark-outline',
        booking: null,
      };
    }

    const badge = getBookingStatusLabel(focus, this.role());
    const actionLabel = this.primaryActionLabel(focus);
    const actionLink = actionLabel ? this.primaryActionLink(focus) : getBookingDetailLink(focus, this.role());

    return {
      title: focus.car_title || 'Reserva',
      subtitle:
        this.role() === 'owner'
          ? 'Tenés una reserva prioritaria para revisar.'
          : 'Tu próxima acción está lista.',
      badge,
      actionLabel: actionLabel ?? 'Ver detalle',
      actionLink,
      actionQuery: actionLabel ? this.primaryActionQuery(focus) : null,
      toneClass: getBookingStatusChipClass(focus),
      icon: 'flash-outline',
      booking: focus,
    };
  });

  readonly quickActions = computed<QuickAction[]>(() => {
    if (this.role() === 'owner') {
      return [
        {
          id: 'publish',
          label: 'Publicar auto',
          icon: 'add-outline',
          link: '/cars/publish',
        },
        {
          id: 'approvals',
          label: 'Aprobaciones',
          icon: 'shield-checkmark-outline',
          link: '/bookings/pending-approval',
          badge: this.pendingApprovals() ?? 0,
        },
        {
          id: 'messages',
          label: 'Mensajes',
          icon: 'chatbubble-ellipses-outline',
          link: '/messages',
        },
      ];
    }

    return [
      {
        id: 'explore',
        label: 'Explorar autos',
        icon: 'search-outline',
        link: '/cars',
      },
      {
        id: 'messages',
        label: 'Mensajes',
        icon: 'chatbubble-ellipses-outline',
        link: '/messages',
      },
      {
        id: 'scout',
        label: 'Modo Scout',
        icon: 'flash-outline',
        link: '/scout/map',
      },
    ];
  });

  readonly filteredBookings = computed(() => {
    const bookings = this.role() === 'owner' ? this.ownerBookings() : this.myBookings();
    const filter = this.filter();
    const role = this.role();
    const searchTerm = this.searchTerm().trim().toLowerCase();
    const filtered = bookings.filter((booking) => {
      if (filter === 'all') return true;

      if (role === 'owner') {
        if (filter === 'approvals') return this.isPendingOwnerApproval(booking);
        if (filter === 'active') return this.isActive(booking);
        if (filter === 'history') return this.isHistory(booking);
        return true;
      }

      if (filter === 'action') return this.isPendingRenter(booking);
      if (filter === 'active') return this.isActive(booking);
      if (filter === 'history') return this.isHistory(booking);
      return true;
    });

    if (!searchTerm) {
      return filtered;
    }

    return filtered.filter((booking) => {
      const haystack = [
        booking.car_title,
        booking.car_city,
        booking.car_province,
        getBookingStatusLabel(booking, this.role()),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(searchTerm);
    });
  });

  readonly sortedBookings = computed(() => {
    const bookings = this.filteredBookings();
    if (this.sortMode() === 'date') {
      return [...bookings].sort((a, b) => {
        const aTime = a.start_at ? new Date(a.start_at).getTime() : 0;
        const bTime = b.start_at ? new Date(b.start_at).getTime() : 0;
        return aTime - bTime;
      });
    }

    return [...bookings].sort((a, b) => this.bookingPriority(a) - this.bookingPriority(b));
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.store.loadMyBookings(), this.store.loadOwnerBookings()]);

    const session = await this.authService.ensureSession();
    if (session?.user?.id) {
      this.store.subscribeToUserBookings('renter');
      this.store.subscribeToUserBookings('owner');
      void this.loadPendingApprovals();
    }
  }

  ngOnDestroy(): void {
    this.store.unsubscribeAll();
  }

  setRole(role: BookingRole): void {
    this.role.set(role);
    this.filter.set('all');
  }

  setFilter(filter: BookingFilter): void {
    this.filter.set(filter);
  }

  private primaryActionLabel(booking: Booking): string | null {
    if (this.role() === 'owner') {
      if (booking.status === 'pending' && booking.payment_mode) return 'Revisar Solicitud';
      if (booking.status === 'pending_review') return 'Finalizar';
      return null;
    }
    if (this.canCompletePay(booking)) return 'Pagar Ahora';
    return null;
  }

  private primaryActionLink(booking: Booking): string[] {
    if (this.role() === 'owner') {
      if (booking.status === 'pending') return ['/bookings/pending-approval'];
      if (booking.status === 'pending_review') return ['/bookings/pending-review'];
      return getBookingDetailLink(booking, this.role());
    }
    return ['/bookings/request'];
  }

  private primaryActionQuery(booking: Booking): Record<string, string> | null {
    return this.role() === 'owner' ? null : { bookingId: booking.id };
  }

  private isActive(booking: Booking): boolean {
    return ['confirmed', 'in_progress'].includes(booking.status);
  }

  private isPendingRenter(booking: Booking): boolean {
    return ['pending', 'pending_payment', 'pending_review'].includes(booking.status);
  }

  private isPendingOwnerApproval(booking: Booking): boolean {
    return booking.status === 'pending' && !!booking.payment_mode;
  }

  private isHistory(booking: Booking): boolean {
    return ['completed', 'cancelled', 'expired'].includes(booking.status);
  }

  private pickFocusBooking(bookings: Booking[]): Booking | null {
    if (bookings.length === 0) return null;
    const sorted = [...bookings].sort((a, b) => this.bookingPriority(a) - this.bookingPriority(b));
    return sorted[0] ?? null;
  }

  private bookingPriority(booking: Booking): number {
    if (this.role() === 'owner') {
      if (this.isPendingOwnerApproval(booking)) return 1;
      if (booking.status === 'pending_review') return 2;
      if (this.isActive(booking)) return 3;
      return 4;
    }
    if (this.canCompletePay(booking)) return 1;
    if (booking.status === 'pending_review') return 2;
    if (this.isActive(booking)) return 3;
    return 4;
  }

  private sumLast30Days(bookings: Booking[]): number {
    const now = Date.now();
    const windowMs = 30 * 24 * 60 * 60 * 1000;
    return bookings.reduce((acc, b) => {
      if (!b.start_at) return acc;
      const ts = new Date(b.start_at).getTime();
      return (ts >= now - windowMs && ts <= now) ? acc + (b.total_amount ?? 0) : acc;
    }, 0);
  }

  private nextTripLabel(bookings: Booking[]): string {
    const upcoming = bookings
      .filter((b) => b.start_at && !this.isHistory(b))
      .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime())[0];
    return upcoming?.start_at ? formatRelativeTime(upcoming.start_at) : '—';
  }

  private canCompletePay(booking: Booking): boolean {
    if (booking.payment_mode === 'wallet') return false;
    const pendingStatus = booking.status === 'pending' || booking.status === 'pending_payment';
    const isPast = booking.start_at ? new Date(booking.start_at).getTime() < Date.now() : false;
    return pendingStatus && !isPast;
  }

  private async loadPendingApprovals(): Promise<void> {
    try {
      const approvals = await this.bookingsService.getPendingApprovals();
      this.pendingApprovals.set(approvals.length);
    } catch {
      this.pendingApprovals.set(null);
    }
  }
}