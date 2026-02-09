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
  keyOutline,
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
    <div class="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <!-- HEADER -->
      <app-bookings-header
        [role]="role()"
        (roleChange)="setRole($event)"
      ></app-bookings-header>

      <main class="px-4 pt-6 space-y-6 max-w-2xl mx-auto">

        <!-- LOADING STATE -->
        @if (loading()) {
          <div class="space-y-5 animate-pulse">
            <!-- Focus card skeleton -->
            <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div class="h-1 bg-gradient-to-r from-slate-200 to-slate-100"></div>
              <div class="p-5 space-y-3">
                <div class="flex justify-between">
                  <div class="h-5 w-24 bg-slate-100 rounded-lg"></div>
                  <div class="h-6 w-20 bg-slate-100 rounded-lg"></div>
                </div>
                <div class="h-5 w-48 bg-slate-100 rounded-lg"></div>
                <div class="h-4 w-32 bg-slate-50 rounded-lg"></div>
              </div>
            </div>
            <!-- Insights skeleton -->
            <div class="grid grid-cols-3 gap-3">
              @for (i of [1, 2, 3]; track i) {
                <div class="bg-white rounded-xl border border-slate-100 p-4 space-y-2">
                  <div class="h-3 w-12 bg-slate-100 rounded"></div>
                  <div class="h-7 w-8 bg-slate-100 rounded-lg"></div>
                </div>
              }
            </div>
            <!-- Cards skeleton -->
            @for (i of [1, 2, 3]; track i) {
              <div class="flex items-center gap-3.5 bg-white rounded-2xl p-3 border border-slate-100">
                <div class="w-[72px] h-[72px] rounded-xl bg-slate-100"></div>
                <div class="flex-1 space-y-2.5">
                  <div class="flex justify-between">
                    <div class="h-4 w-28 bg-slate-100 rounded"></div>
                    <div class="h-4 w-16 bg-slate-100 rounded"></div>
                  </div>
                  <div class="h-3 w-24 bg-slate-50 rounded"></div>
                  <div class="h-5 w-20 bg-slate-50 rounded-md"></div>
                </div>
              </div>
            }
          </div>
        }

        <!-- ERROR STATE -->
        @else if (hasError()) {
          <div class="flex flex-col items-center justify-center py-24 text-center">
            <div class="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mb-5
                        ring-8 ring-red-50/50">
              <ion-icon name="alert-circle-outline" class="text-4xl text-red-400"></ion-icon>
            </div>
            <h3 class="text-xl font-extrabold text-slate-900 mb-2">No pudimos cargar tus reservas</h3>
            <p class="text-sm text-slate-400 max-w-xs leading-relaxed">
              Verifica tu conexion a internet e intenta nuevamente.
            </p>
            <button
              (click)="retry()"
              class="mt-6 px-6 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl
                     shadow-lg shadow-slate-900/20 hover:shadow-xl
                     active:scale-95 transition-all duration-200"
            >
              Reintentar
            </button>
          </div>
        }

        <!-- EMPTY STATE -->
        @else if (currentBookings().length === 0) {
          <div class="flex flex-col items-center justify-center py-20 text-center">
            <!-- Decorative circles -->
            <div class="relative mb-8">
              <div class="absolute -inset-4 rounded-full bg-indigo-50/50 animate-pulse"></div>
              <div class="absolute -inset-2 rounded-full bg-indigo-50/80"></div>
              <div class="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50
                          flex items-center justify-center shadow-inner">
                @if (role() === 'owner') {
                  <ion-icon name="key-outline" class="text-5xl text-slate-300"></ion-icon>
                } @else {
                  <ion-icon name="car-sport-outline" class="text-5xl text-slate-300"></ion-icon>
                }
              </div>
            </div>

            <h3 class="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">
              {{ role() === 'owner' ? 'Sin reservas aun' : 'Empeza tu viaje' }}
            </h3>
            <p class="text-sm text-slate-400 max-w-[260px] mx-auto leading-relaxed mb-8">
              {{ role() === 'owner'
                ? 'Cuando alguien reserve tus autos, aparecera todo aca.'
                : 'Explora autos increibles y reserva tu proximo viaje.' }}
            </p>

            @if (role() === 'renter') {
              <a
                routerLink="/marketplace"
                class="inline-flex items-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800
                       text-white text-sm font-bold rounded-xl shadow-lg shadow-slate-900/25
                       hover:shadow-xl active:scale-95 transition-all duration-200"
              >
                <ion-icon name="search-outline" class="text-lg"></ion-icon>
                Explorar autos
              </a>
              <p class="mt-4 text-xs text-slate-300">Mas de 500 autos disponibles</p>
            } @else {
              <a
                routerLink="/cars/publish"
                class="inline-flex items-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800
                       text-white text-sm font-bold rounded-xl shadow-lg shadow-slate-900/25
                       hover:shadow-xl active:scale-95 transition-all duration-200"
              >
                <ion-icon name="add-outline" class="text-lg"></ion-icon>
                Publicar mi auto
              </a>
              <p class="mt-4 text-xs text-slate-300">Comenza a generar ingresos hoy</p>
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

          <!-- SECTION HEADER -->
          <div class="flex items-center justify-between pt-1">
            <h2 class="text-base font-extrabold text-slate-900 tracking-tight">Reservas</h2>
            <span class="text-xs font-medium text-slate-400">
              {{ sortedBookings().length }} {{ sortedBookings().length === 1 ? 'reserva' : 'reservas' }}
            </span>
          </div>

          <!-- BOOKINGS LIST -->
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
      keyOutline,
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
