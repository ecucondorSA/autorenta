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
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingUiService } from '@core/services/bookings/booking-ui.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import type { Booking } from '@core/models';
import { BookingsStore } from '@core/stores/bookings.store';
import { addIcons } from 'ionicons';
import {
  carSportOutline,
  searchOutline,
  addOutline,
  alertCircleOutline,
} from 'ionicons/icons';

import { IonIcon } from '@ionic/angular/standalone';
import { BookingRole, BookingFilter, FilterItem, FocusCard, InsightItem, BookingQuickAction } from './bookings-hub.types';
import { BookingsHeaderComponent } from './components/bookings-header.component';
import { BookingsFocusCardComponent } from './components/bookings-focus-card.component';
import { BookingsInsightsComponent } from './components/bookings-insights.component';
import { BookingsQuickActionsComponent } from './components/bookings-quick-actions.component';
import { BookingsListComponent } from './components/bookings-list.component';


@Component({
  standalone: true,
  selector: 'app-bookings-hub',
  imports: [
    CommonModule,
    RouterLink,
    IonIcon,
    BookingsHeaderComponent,
    BookingsFocusCardComponent,
    BookingsInsightsComponent,
    BookingsQuickActionsComponent,
    BookingsListComponent,
  ],
  template: `
    <div class="min-h-screen bg-slate-50 pb-24">
      <!-- HEADER -->
      <app-bookings-header
        [role]="role()"
        (roleChange)="setRole($event)"
      ></app-bookings-header>

      <main class="px-4 pt-5 space-y-5 max-w-2xl mx-auto">

        <!-- LOADING STATE -->
        @if (loading()) {
          <div class="space-y-4 animate-pulse">
            <div class="h-28 bg-white rounded-2xl"></div>
            <div class="flex gap-3">
              <div class="h-16 flex-1 bg-white rounded-xl"></div>
              <div class="h-16 flex-1 bg-white rounded-xl"></div>
              <div class="h-16 flex-1 bg-white rounded-xl"></div>
            </div>
            @for (i of [1, 2, 3]; track i) {
              <div class="h-24 bg-white rounded-2xl"></div>
            }
          </div>
        }

        <!-- ERROR STATE -->
        @else if (hasError()) {
          <div class="flex flex-col items-center justify-center py-20 text-center">
            <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <ion-icon name="alert-circle-outline" class="text-3xl text-red-400"></ion-icon>
            </div>
            <h3 class="text-lg font-bold text-slate-900">No pudimos cargar tus reservas</h3>
            <p class="text-sm text-slate-500 mt-1 max-w-xs">Verifica tu conexion e intenta nuevamente.</p>
            <button
              (click)="retry()"
              class="mt-5 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl active:scale-95 transition-transform"
            >
              Reintentar
            </button>
          </div>
        }

        <!-- EMPTY STATE -->
        @else if (currentBookings().length === 0) {
          <div class="flex flex-col items-center justify-center py-16 text-center">
            <div class="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-5">
              <ion-icon name="car-sport-outline" class="text-4xl text-slate-300"></ion-icon>
            </div>
            <h3 class="text-xl font-bold text-slate-900">
              {{ role() === 'owner' ? 'Sin reservas de tus autos' : 'Aun no tenes reservas' }}
            </h3>
            <p class="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
              {{ role() === 'owner'
                ? 'Cuando alguien reserve tus autos, los veras aca.'
                : 'Explora autos disponibles y reserva tu proximo viaje.' }}
            </p>
            @if (role() === 'renter') {
              <a
                routerLink="/marketplace"
                class="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl active:scale-95 transition-transform"
              >
                <ion-icon name="search-outline"></ion-icon>
                Explorar autos
              </a>
            } @else {
              <a
                routerLink="/cars/publish"
                class="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl active:scale-95 transition-transform"
              >
                <ion-icon name="add-outline"></ion-icon>
                Publicar auto
              </a>
            }
          </div>
        }

        <!-- CONTENT -->
        @else {
          <!-- FOCUS CARD (only if there's an action needed) -->
          @if (focusCard().booking) {
            <app-bookings-focus-card
              [card]="focusCard()"
              [role]="role()"
            ></app-bookings-focus-card>
          }

          <!-- STATS -->
          @if (currentBookings().length > 0) {
            <app-bookings-insights
              [items]="insightItems()"
            ></app-bookings-insights>
          }

          <!-- QUICK ACTIONS -->
          <app-bookings-quick-actions
            [actions]="quickActions()"
          ></app-bookings-quick-actions>

          <!-- BOOKINGS LIST -->
          <app-bookings-list
            [bookings]="sortedBookings()"
            [role]="role()"
          ></app-bookings-list>
        }
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingsHubPage implements OnInit, OnDestroy {
  private readonly store = inject(BookingsStore);
  private readonly authService = inject(AuthService);
  private readonly bookingsService = inject(BookingsService);
  private readonly bookingUi = inject(BookingUiService);

  readonly loading = this.store.loadingList;
  readonly role = signal<BookingRole>('renter');
  readonly filter = signal<BookingFilter>('all');
  readonly pendingApprovals = signal<number | null>(null);
  readonly hasError = signal(false);

  readonly myBookings = this.store.myBookings;
  readonly ownerBookings = this.store.ownerBookings;

  readonly currentBookings = computed(() =>
    this.role() === 'owner' ? this.ownerBookings() : this.myBookings(),
  );

  constructor() {
    addIcons({
      carSportOutline,
      searchOutline,
      addOutline,
      alertCircleOutline,
    });
  }

  readonly insightItems = computed<InsightItem[]>(() => {
    const bookings = this.currentBookings();
    const isOwner = this.role() === 'owner';

    const activeCount = bookings.filter((b) => this.isActive(b)).length;
    const pendingCount = bookings.filter((b) =>
      isOwner ? this.isPendingOwnerApproval(b) : this.isPendingRenter(b),
    ).length;
    const historyCount = bookings.filter((b) => this.isHistory(b)).length;

    return [
      {
        id: 'active',
        label: 'Activas',
        value: activeCount,
        type: 'count',
        icon: 'rocket-outline',
      },
      {
        id: 'pending',
        label: isOwner ? 'Por aprobar' : 'Pendientes',
        value: pendingCount,
        type: 'count',
        icon: 'hourglass-outline',
      },
      {
        id: 'history',
        label: 'Historial',
        value: historyCount,
        type: 'count',
        icon: 'receipt-outline',
      },
    ];
  });

  readonly filters = computed<FilterItem[]>(() => {
    const bookings = this.currentBookings();
    const isOwner = this.role() === 'owner';

    return [
      { id: 'all', label: 'Todas', count: bookings.length },
      {
        id: isOwner ? 'approvals' : 'action',
        label: isOwner ? 'Aprobar' : 'Pendientes',
        count: bookings.filter((b) =>
          isOwner ? this.isPendingOwnerApproval(b) : this.isPendingRenter(b),
        ).length,
      },
      {
        id: 'active',
        label: 'Activas',
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
    const bookings = this.currentBookings();
    const focus = this.pickFocusBooking(bookings);
    if (!focus) {
      return {
        title: 'Todo en orden',
        subtitle: 'No hay acciones urgentes.',
        badge: 'Sin urgencias',
        actionLabel: null,
        actionLink: null,
        actionQuery: null,
        toneClass: 'bg-slate-50 text-slate-500 border-slate-200',
        icon: 'shield-checkmark-outline',
        booking: null,
      };
    }

    const ui = this.bookingUi.getUiState(focus, this.role());
    const actionLabel = this.primaryActionLabel(focus);
    const detailLink = this.role() === 'owner'
      ? ['/bookings/owner', focus.id]
      : ['/bookings', focus.id];
    const actionLink = actionLabel
      ? this.primaryActionLink(focus)
      : detailLink;

    return {
      title: focus.car_title || 'Reserva',
      subtitle:
        this.role() === 'owner'
          ? 'Tenes una reserva para revisar.'
          : 'Tu proxima accion esta lista.',
      badge: ui.labelShort,
      actionLabel: actionLabel ?? 'Ver detalle',
      actionLink,
      actionQuery: actionLabel ? this.primaryActionQuery(focus) : null,
      toneClass: ui.badgeClass,
      icon: 'flash-outline',
      booking: focus,
    };
  });

  readonly quickActions = computed<BookingQuickAction[]>(() => {
    if (this.role() === 'owner') {
      return [
        { id: 'publish', label: 'Publicar', icon: 'add-outline', link: '/cars/publish' },
        {
          id: 'approvals',
          label: 'Aprobar',
          icon: 'shield-checkmark-outline',
          link: '/bookings/pending-approval',
          badge: this.pendingApprovals() ?? 0,
        },
        { id: 'messages', label: 'Mensajes', icon: 'chatbubble-ellipses-outline', link: '/messages' },
      ];
    }

    return [
      { id: 'explore', label: 'Explorar', icon: 'search-outline', link: '/marketplace' },
      { id: 'messages', label: 'Mensajes', icon: 'chatbubble-ellipses-outline', link: '/messages' },
    ];
  });

  readonly filteredBookings = computed(() => {
    const bookings = this.currentBookings();
    const f = this.filter();

    return bookings.filter((booking) => {
      if (f === 'all') return true;
      if (f === 'approvals') return this.isPendingOwnerApproval(booking);
      if (f === 'action') return this.isPendingRenter(booking);
      if (f === 'active') return this.isActive(booking);
      if (f === 'history') return this.isHistory(booking);
      return true;
    });
  });

  readonly sortedBookings = computed(() => {
    const bookings = this.filteredBookings();
    return [...bookings].sort((a, b) => this.bookingPriority(a) - this.bookingPriority(b));
  });

  async ngOnInit(): Promise<void> {
    try {
      await Promise.all([this.store.loadMyBookings(), this.store.loadOwnerBookings()]);
    } catch {
      this.hasError.set(true);
    }

    try {
      const session = await this.authService.ensureSession();
      if (session?.user?.id) {
        this.store.subscribeToUserBookings('renter');
        this.store.subscribeToUserBookings('owner');
        void this.loadPendingApprovals();
      }
    } catch {
      // Silently fail on realtime - data already loaded
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

  async retry(): Promise<void> {
    this.hasError.set(false);
    try {
      await Promise.all([
        this.store.loadMyBookings({ force: true }),
        this.store.loadOwnerBookings({ force: true }),
      ]);
    } catch {
      this.hasError.set(true);
    }
  }

  private primaryActionLabel(booking: Booking): string | null {
    if (this.role() === 'owner') {
      if (booking.status === 'pending' && booking.payment_mode) return 'Revisar solicitud';
      if (booking.status === 'pending_review') return 'Finalizar';
      return null;
    }
    if (this.canCompletePay(booking)) return 'Pagar ahora';
    return null;
  }

  private primaryActionLink(booking: Booking): string[] {
    if (this.role() === 'owner') {
      if (booking.status === 'pending') return ['/bookings/pending-approval'];
      if (booking.status === 'pending_review') return ['/bookings/pending-review'];
      return ['/bookings/owner', booking.id];
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
    return ['completed', 'cancelled', 'expired', 'cancelled_renter', 'cancelled_owner', 'cancelled_system', 'rejected'].includes(booking.status);
  }

  private pickFocusBooking(bookings: Booking[]): Booking | null {
    if (bookings.length === 0) return null;
    const actionable = [...bookings].sort((a, b) => this.bookingPriority(a) - this.bookingPriority(b));
    const top = actionable[0];
    // Only show focus if there's an actual action
    if (top && this.bookingPriority(top) < 4) return top;
    return null;
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
