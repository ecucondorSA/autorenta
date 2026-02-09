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
import { UnreadMessagesService } from '@core/services/bookings/unread-messages.service';
import type { Booking } from '@core/models';
import { BookingsStore } from '@core/stores/bookings.store';
import { addIcons } from 'ionicons';
import {
  carSportOutline,
  searchOutline,
  addOutline,
  alertCircleOutline,
  flashOutline,
  todayOutline,
  hourglassOutline,
  calendarOutline,
  timeOutline,
} from 'ionicons/icons';

import { IonIcon } from '@ionic/angular/standalone';
import {
  BookingRole,
  BookingFilter,
  FilterItem,
  FocusCard,
  InsightItem,
  BookingQuickAction,
  OperationalPhase,
  OperationalGroup,
} from './bookings-hub.types';
import { BookingsHeaderComponent } from './components/bookings-header.component';
import { BookingsFocusCardComponent } from './components/bookings-focus-card.component';
import { BookingsInsightsComponent } from './components/bookings-insights.component';
import { BookingsQuickActionsComponent } from './components/bookings-quick-actions.component';
import { BookingsListComponent } from './components/bookings-list.component';
import { BookingsOperationalDashboardComponent } from './components/bookings-operational-dashboard.component';

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
    BookingsOperationalDashboardComponent,
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
          <!-- Owner empty: show operational dashboard -->
          @if (role() === 'owner') {
            <app-bookings-operational-dashboard
              [role]="role()"
              [historyBookings]="[]"
            ></app-bookings-operational-dashboard>
          } @else {
            <div class="flex flex-col items-center justify-center py-16 text-center">
              <img src="/assets/images/illustrations/empty-bookings.png" alt="Sin reservas" class="w-48 h-auto mb-5 mx-auto" />
              <h3 class="text-xl font-bold text-slate-900">Aun no tenes reservas</h3>
              <p class="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                Explora autos disponibles y reserva tu proximo viaje.
              </p>
              <a
                routerLink="/marketplace"
                class="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl active:scale-95 transition-transform"
              >
                <ion-icon name="search-outline"></ion-icon>
                Explorar autos
              </a>
            </div>
          }
        }

        <!-- CONTENT: OPERATIONAL COMMAND CENTER -->
        @else {
          <!-- FOCUS CARD (highest priority action) -->
          @if (focusCard().booking) {
            <app-bookings-focus-card
              [card]="focusCard()"
              [role]="role()"
            ></app-bookings-focus-card>
          }

          <!-- STATS / FINANCIAL PULSE -->
          <app-bookings-insights
            [items]="insightItems()"
          ></app-bookings-insights>

          <!-- QUICK ACTIONS -->
          <app-bookings-quick-actions
            [actions]="quickActions()"
          ></app-bookings-quick-actions>

          <!-- OPERATIONAL DASHBOARD (owner mode) -->
          @if (role() === 'owner') {
            <app-bookings-operational-dashboard
              [role]="role()"
              [historyBookings]="historyBookings()"
            ></app-bookings-operational-dashboard>
          }

          <!-- GROUPED BOOKINGS BY OPERATIONAL PHASE -->
          @for (group of operationalGroups(); track group.phase) {
            <section class="space-y-3">
              <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-2">
                <ion-icon [name]="group.icon" class="text-sm"></ion-icon>
                {{ group.label }}
                <span class="text-slate-300">({{ group.bookings.length }})</span>
              </h3>
              <app-bookings-list
                [bookings]="group.bookings"
                [role]="role()"
                [filters]="group.phase === 'history' ? filters() : []"
                [currentFilter]="filter()"
                (filterChange)="setFilter($event)"
              ></app-bookings-list>
            </section>
          }
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
  private readonly unreadMessages = inject(UnreadMessagesService);

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
      flashOutline,
      todayOutline,
      hourglassOutline,
      calendarOutline,
      timeOutline,
    });
  }

  // ─── Financial Pulse (Insights) ───────────────────────────────────

  readonly insightItems = computed<InsightItem[]>(() => {
    const bookings = this.currentBookings();
    const isOwner = this.role() === 'owner';

    if (isOwner) {
      const activeBookings = bookings.filter((b) => this.isActive(b));
      const activeRevenue = activeBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const pendingCount = bookings.filter((b) => this.isPendingOwnerApproval(b)).length;
      const activeDeposits = bookings.filter((b) =>
        b.deposit_status === 'locked',
      ).length;

      return [
        { id: 'revenue', label: 'Ingresos activos', value: activeRevenue, type: 'money' as const, icon: 'cash-outline' },
        { id: 'pending', label: 'Por aprobar', value: pendingCount, type: 'count' as const, icon: 'hourglass-outline' },
        { id: 'deposits', label: 'Garantias activas', value: activeDeposits, type: 'count' as const, icon: 'shield-checkmark-outline' },
      ];
    }

    const activeCount = bookings.filter((b) => this.isActive(b)).length;
    const pendingCount = bookings.filter((b) => this.isPendingRenter(b)).length;
    const historyCount = bookings.filter((b) => this.isHistory(b)).length;

    return [
      { id: 'active', label: 'Activas', value: activeCount, type: 'count' as const, icon: 'rocket-outline' },
      { id: 'pending', label: 'Pendientes', value: pendingCount, type: 'count' as const, icon: 'hourglass-outline' },
      { id: 'history', label: 'Historial', value: historyCount, type: 'count' as const, icon: 'receipt-outline' },
    ];
  });

  // ─── Filters ──────────────────────────────────────────────────────

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

  // ─── Focus Card ───────────────────────────────────────────────────

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

  // ─── Quick Actions ────────────────────────────────────────────────

  readonly quickActions = computed<BookingQuickAction[]>(() => {
    const totalUnread = this.unreadMessages.totalUnreadCount();

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
        { id: 'messages', label: 'Mensajes', icon: 'chatbubble-ellipses-outline', link: '/messages', badge: totalUnread },
      ];
    }

    return [
      { id: 'explore', label: 'Explorar', icon: 'search-outline', link: '/marketplace' },
      { id: 'messages', label: 'Mensajes', icon: 'chatbubble-ellipses-outline', link: '/messages', badge: totalUnread },
    ];
  });

  // ─── Operational Grouping ─────────────────────────────────────────

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

  readonly operationalGroups = computed<OperationalGroup[]>(() => {
    const bookings = this.filteredBookings();
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const groups = new Map<OperationalPhase, Booking[]>();

    for (const b of bookings) {
      const phase = this.classifyPhase(b, now, todayStart.getTime(), todayEnd.getTime());
      if (!groups.has(phase)) groups.set(phase, []);
      groups.get(phase)!.push(b);
    }

    // Sort within each group by priority
    for (const [, list] of groups) {
      list.sort((a, b) => this.bookingPriority(a) - this.bookingPriority(b));
    }

    const phaseOrder: { phase: OperationalPhase; label: string; icon: string }[] = [
      { phase: 'urgent', label: 'Requiere accion', icon: 'flash-outline' },
      { phase: 'today', label: 'Hoy', icon: 'today-outline' },
      { phase: 'active', label: 'Viajes activos', icon: 'car-sport-outline' },
      { phase: 'awaiting', label: 'Esperando respuesta', icon: 'hourglass-outline' },
      { phase: 'upcoming', label: 'Proximas', icon: 'calendar-outline' },
      { phase: 'history', label: 'Historial', icon: 'time-outline' },
    ];

    return phaseOrder
      .filter((g) => groups.has(g.phase))
      .map((g) => ({ ...g, bookings: groups.get(g.phase)! }));
  });

  readonly historyBookings = computed(() =>
    this.currentBookings().filter((b) => this.isHistory(b)),
  );

  // Keep sortedBookings for backward compat (used nowhere now but safe)
  readonly sortedBookings = computed(() => {
    const bookings = this.filteredBookings();
    return [...bookings].sort((a, b) => this.bookingPriority(a) - this.bookingPriority(b));
  });

  // ─── Lifecycle ────────────────────────────────────────────────────

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

  // ─── Countdown Targets (public for template/child access) ────────

  getCountdownTarget(booking: Booking): string | null {
    switch (booking.status) {
      case 'pending':
      case 'pending_payment':
        return booking.expires_at ?? null;
      case 'confirmed':
        return booking.start_at ?? null;
      case 'in_progress':
        return booking.end_at ?? null;
      case 'pending_return':
        return booking.auto_release_at ?? null;
      default:
        return null;
    }
  }

  getCountdownLabel(booking: Booking): string | null {
    switch (booking.status) {
      case 'pending':
      case 'pending_payment':
        return 'Vence en';
      case 'confirmed':
        return 'Retiro en';
      case 'in_progress':
        return 'Devolver en';
      case 'pending_return':
        return 'Inspeccion en';
      default:
        return null;
    }
  }

  getUnreadCount(bookingId: string): number {
    const conversations = this.unreadMessages.unreadConversations();
    const match = conversations.find(
      (c) => c.type === 'booking' && c.conversationId === bookingId,
    );
    return match?.unreadCount ?? 0;
  }

  // ─── Phase Classification ─────────────────────────────────────────

  private classifyPhase(
    booking: Booking,
    now: number,
    todayStart: number,
    todayEnd: number,
  ): OperationalPhase {
    const isOwner = this.role() === 'owner';

    // Terminal states → history
    if (this.isHistory(booking)) return 'history';

    // Urgent: needs immediate action
    const ui = this.bookingUi.getUiState(booking, this.role());
    if (ui.priority === 'urgent') return 'urgent';

    // Payment expiring soon (< 6h)
    if (
      (booking.status === 'pending' || booking.status === 'pending_payment') &&
      booking.expires_at
    ) {
      const expiresIn = new Date(booking.expires_at).getTime() - now;
      if (expiresIn > 0 && expiresIn < 6 * 60 * 60 * 1000) return 'urgent';
    }

    // Today: checkin or checkout happening today
    const startAt = booking.start_at ? new Date(booking.start_at).getTime() : 0;
    const endAt = booking.end_at ? new Date(booking.end_at).getTime() : 0;

    if (booking.status === 'confirmed' && startAt >= todayStart && startAt <= todayEnd) {
      return 'today';
    }
    if (booking.status === 'in_progress' && endAt >= todayStart && endAt <= todayEnd) {
      return 'today';
    }

    // Active trips
    if (booking.status === 'in_progress') return 'active';

    // Awaiting: waiting on the other party
    if (booking.status === 'pending_return' || booking.status === 'pending_review') {
      return 'awaiting';
    }
    if (isOwner && booking.status === 'pending_owner_approval') return 'urgent';
    if (!isOwner && booking.status === 'pending_owner_approval') return 'awaiting';

    // Upcoming: confirmed, not today
    if (booking.status === 'confirmed') return 'upcoming';

    // Pending payment/approval
    if (booking.status === 'pending' || booking.status === 'pending_payment') {
      return isOwner ? 'awaiting' : 'urgent';
    }

    // Dispute states
    if (['dispute', 'disputed', 'pending_dispute_resolution'].includes(booking.status)) {
      return 'urgent';
    }

    return 'awaiting';
  }

  // ─── Private Helpers ──────────────────────────────────────────────

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
