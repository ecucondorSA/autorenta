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
import { BookingsService } from '@core/services/bookings/bookings.service';
import type { Booking } from '@core/models';
import { BookingsStore } from '@core/stores/bookings.store';
import { IconComponent } from '@shared/components/icon/icon.component';
import { PressScaleDirective } from '@shared/directives/press-scale.directive';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { formatDateRange, formatRelativeTime, formatTime } from '@shared/utils/date.utils';

type BookingRole = 'renter' | 'owner';
type BookingFilter =
  | 'all'
  | 'action'
  | 'active'
  | 'upcoming'
  | 'history'
  | 'approvals'
  | 'review';

interface FilterItem {
  id: BookingFilter;
  label: string;
  count: number;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  link: string;
  query?: Record<string, string>;
  badge?: number;
}

interface FocusCard {
  title: string;
  subtitle: string;
  badge: string;
  actionLabel: string | null;
  actionLink: string[] | null;
  actionQuery?: Record<string, string> | null;
  toneClass: string;
  booking: Booking | null;
}

interface InsightItem {
  id: string;
  label: string;
  value: number | string;
  type: 'money' | 'count' | 'text';
}

/**
 * BookingsHubPage - Dual mode (Renter / Owner)
 *
 * A single, professional hub with segmented control and
 * role-aware summaries/actions.
 */
@Component({
  standalone: true,
  selector: 'app-bookings-hub',
  imports: [CommonModule, RouterLink, IconComponent, MoneyPipe, PressScaleDirective],
  template: `
    <div class="min-h-screen bg-surface-primary pb-24">
      <header class="sticky top-0 z-20 border-b border-border-default backdrop-blur">
        <div class="absolute inset-0 bg-gradient-to-b from-cta-default/10 via-surface-primary to-surface-primary pointer-events-none"></div>
        <div class="relative container-page px-4 sm:px-6 py-4 space-y-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-xs text-text-secondary">Mis reservas</p>
              <h1 class="text-2xl sm:text-3xl font-satoshi font-bold text-text-primary tracking-tight">
                Centro de reservas
              </h1>
              <p class="text-xs text-text-secondary mt-1">
                {{ roleLabel() }} · {{ todayLabel() }}
              </p>
            </div>
            <a
              routerLink="/calendar"
              appPressScale
              class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border-default bg-surface-raised text-text-secondary text-sm font-medium hover:text-text-primary hover:border-cta-default transition-colors"
            >
              <app-icon name="calendar" [size]="16" />
              <span class="hidden sm:inline">Agenda</span>
            </a>
          </div>

          <div class="relative z-10 flex w-full max-w-sm rounded-2xl bg-surface-secondary/70 p-1 ring-1 ring-border-default/70">
            <button
              type="button"
              (click)="setRole('renter')"
              appPressScale
              class="flex-1 px-4 py-3 min-h-[48px] text-sm font-semibold rounded-xl transition-colors touch-manipulation"
              [class]="
                role() === 'renter'
                  ? 'bg-surface-raised text-cta-default shadow-sm ring-1 ring-cta-default/20'
                  : 'text-text-secondary hover:text-text-primary'
              "
              aria-pressed="{{ role() === 'renter' }}"
            >
              Arrendatario
            </button>
            <button
              type="button"
              (click)="setRole('owner')"
              appPressScale
              class="flex-1 px-4 py-3 min-h-[48px] text-sm font-semibold rounded-xl transition-colors touch-manipulation"
              [class]="
                role() === 'owner'
                  ? 'bg-surface-raised text-cta-default shadow-sm ring-1 ring-cta-default/20'
                  : 'text-text-secondary hover:text-text-primary'
              "
              aria-pressed="{{ role() === 'owner' }}"
            >
              Propietario
            </button>
          </div>
        </div>
      </header>

      <main class="container-page px-4 sm:px-6 space-y-6 pt-4">
        @if (loading()) {
          <div class="flex items-center justify-center py-16">
            <div class="flex flex-col items-center gap-3">
              <div class="w-12 h-12 border-4 border-cta-default border-t-transparent rounded-full animate-spin"></div>
              <p class="text-sm text-text-secondary">Cargando tus reservas...</p>
            </div>
          </div>
        } @else {
          <section class="space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-text-primary uppercase tracking-wide">
                En foco
              </h2>
              <span class="text-xs text-text-secondary">Prioridad del día</span>
            </div>
            <div
              class="rounded-2xl border border-border-default bg-gradient-to-br from-surface-raised via-surface-raised to-surface-secondary p-4 sm:p-5 shadow-sm"
            >
              @if (focusCard().booking; as focusBooking) {
                <div class="flex items-start justify-between gap-4">
                  <div class="space-y-2">
                    <span
                      class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                      [class]="focusCard().toneClass"
                    >
                      {{ focusCard().badge }}
                    </span>
                    <h3 class="text-lg font-semibold text-text-primary">
                      {{ focusCard().title }}
                    </h3>
                    <p class="text-sm text-text-secondary">{{ focusCard().subtitle }}</p>
                    <div class="flex items-center gap-3 text-xs text-text-secondary">
                      <span>{{ rangeLabel(focusBooking) }}</span>
                      <span class="hidden sm:inline">· {{ timelineLabel(focusBooking) }}</span>
                      @if (focusBooking.car_city || focusBooking.car_province) {
                        <span class="hidden sm:inline">
                          · {{ focusBooking.car_city || '' }}{{
                            focusBooking.car_city && focusBooking.car_province ? ', ' : ''
                          }}{{ focusBooking.car_province || '' }}
                        </span>
                      }
                    </div>
                  </div>
                  <div class="flex flex-col items-end gap-2">
                    <p class="text-lg font-semibold text-text-primary">
                      {{ focusBooking.total_amount | money }}
                    </p>
                    @if (focusCard().actionLabel && focusCard().actionLink) {
                      <a
                        [routerLink]="focusCard().actionLink"
                        [queryParams]="focusCard().actionQuery ?? null"
                        appPressScale
                        class="px-3 py-2 rounded-xl bg-cta-default text-cta-text text-xs font-semibold hover:bg-cta-hover transition-colors"
                      >
                        {{ focusCard().actionLabel }}
                      </a>
                    }
                  </div>
                </div>
              } @else {
                <div class="text-center py-4">
                  <p class="text-sm text-text-secondary">
                    No hay tareas urgentes en este momento.
                  </p>
                  <p class="text-xs text-text-secondary mt-1">
                    Te avisaremos cuando haya una acción pendiente.
                  </p>
                </div>
              }
            </div>
          </section>

          <section class="space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-text-primary uppercase tracking-wide">Resumen hoy</h2>
              <span class="text-xs text-text-secondary">{{ summaryHint() }}</span>
            </div>
            <div class="grid grid-cols-3 gap-3">
              @for (item of summaryItems(); track item.id) {
                <div
                  class="rounded-2xl border border-border-default bg-surface-raised p-3 sm:p-4 transition-shadow hover:shadow-md"
                  [class.opacity-60]="item.value === 0"
                >
                  <div class="flex items-center justify-between">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center"
                      [class]="item.iconClass"
                    >
                      <app-icon [name]="item.icon" [size]="18" />
                    </div>
                    <span class="text-2xl font-bold text-text-primary">{{ item.value }}</span>
                  </div>
                  <p class="text-xs text-text-secondary mt-2">{{ item.label }}</p>
                </div>
              }
            </div>
          </section>

          <section class="space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-text-primary uppercase tracking-wide">
                Indicadores clave
              </h2>
              <span class="text-xs text-text-secondary">Últimos 30 días</span>
            </div>
            <div class="grid grid-cols-3 gap-3">
              @for (item of insightItems(); track item.id) {
                <div class="rounded-2xl border border-border-default bg-surface-raised p-3 sm:p-4">
                  <p class="text-xs text-text-secondary">{{ item.label }}</p>
                  <p class="text-lg font-semibold text-text-primary mt-1">
                    @if (item.type === 'money') {
                      {{ $any(item.value) | money }}
                    } @else {
                      {{ item.value }}
                    }
                  </p>
                </div>
              }
            </div>
          </section>

          <section class="space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-text-primary uppercase tracking-wide">
                Acciones rápidas
              </h2>
              <span class="text-xs text-text-secondary">Accesos directos</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              @for (action of quickActions(); track action.id) {
                <a
                  [routerLink]="action.link"
                  [queryParams]="action.query"
                  appPressScale
                  class="group rounded-2xl border border-border-default bg-surface-raised p-3 flex items-center gap-3 transition-all hover:border-cta-default hover:shadow-md"
                >
                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-secondary text-text-secondary group-hover:text-cta-default"
                  >
                    <app-icon [name]="action.icon" [size]="18" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-text-primary truncate">{{ action.label }}</p>
                    @if (action.badge && action.badge > 0) {
                      <span
                        class="inline-flex items-center justify-center min-w-[20px] h-5 px-2 rounded-full text-[11px] font-semibold bg-warning-bg text-warning-strong mt-1"
                      >
                        {{ action.badge }}
                      </span>
                    }
                  </div>
                </a>
              }
            </div>
          </section>

          <section class="space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-text-primary uppercase tracking-wide">
                Agenda inmediata
              </h2>
              <span class="text-xs text-text-secondary">Próximos movimientos</span>
            </div>
            @if (upcomingBookings().length === 0) {
              <div class="rounded-2xl border border-dashed border-border-default bg-surface-raised p-4 text-sm text-text-secondary">
                No hay movimientos próximos en los próximos días.
              </div>
            } @else {
              <div class="space-y-3">
                @for (booking of upcomingBookings(); track booking.id) {
                  <div class="flex items-start gap-3 rounded-2xl border border-border-default bg-surface-raised p-4">
                    <div class="mt-1 h-2.5 w-2.5 rounded-full bg-cta-default"></div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-3">
                        <p class="text-sm font-semibold text-text-primary truncate">
                          {{ booking.car_title || 'Auto' }}
                        </p>
                        <span
                          class="flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          [class]="statusChipClass(booking)"
                        >
                          {{ statusLabel(booking) }}
                        </span>
                      </div>
                      <p class="text-xs text-text-secondary mt-1">
                        {{ timelineLabel(booking) }} · {{ rangeLabel(booking) }}
                      </p>
                      @if (booking.car_city || booking.car_province) {
                        <p class="text-xs text-text-secondary/70 mt-1">
                          {{ booking.car_city || '' }}{{
                            booking.car_city && booking.car_province ? ', ' : ''
                          }}{{ booking.car_province || '' }}
                        </p>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </section>

          <section class="space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-base font-semibold text-text-primary">
                {{ currentFilterLabel() }}
              </h2>
              @if (filteredBookings().length > 0) {
                <span class="text-xs text-text-secondary">
                  {{ filteredBookings().length }} {{ filteredBookings().length === 1 ? 'reserva' : 'reservas' }}
                </span>
              }
            </div>

            <div class="flex items-center gap-3">
              <div class="flex-1 relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                  <app-icon name="search" [size]="16" />
                </span>
                <input
                  type="text"
                  [value]="searchTerm()"
                  (input)="onSearchInput($event)"
                  placeholder="Buscar por auto, ciudad o estado"
                  class="w-full pl-10 pr-3 py-2.5 rounded-xl border border-border-default bg-surface-raised text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-cta-default/40"
                />
              </div>
              <button
                type="button"
                (click)="toggleSort()"
                appPressScale
                class="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border-default bg-surface-raised text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-cta-default transition-colors"
              >
                <app-icon name="filter" [size]="16" />
                <span class="hidden sm:inline">{{ sortLabel() }}</span>
              </button>
            </div>

            <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
              @for (filterItem of filters(); track filterItem.id) {
                <button
                  type="button"
                  (click)="setFilter(filterItem.id)"
                  appPressScale
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors flex-shrink-0 min-h-[40px]"
                  [class]="
                    filter() === filterItem.id
                      ? 'bg-cta-default text-cta-text border-cta-default shadow-sm'
                      : 'bg-surface-raised text-text-secondary border-border-default hover:text-text-primary hover:border-cta-default'
                  "
                >
                  <span>{{ filterItem.label }}</span>
                  <span
                    class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold"
                    [class]="
                      filter() === filterItem.id
                        ? 'bg-white/20 text-cta-text'
                        : 'bg-surface-secondary text-text-secondary'
                    "
                  >
                    {{ filterItem.count }}
                  </span>
                </button>
              }
            </div>

            @if (filteredBookings().length === 0) {
              <div class="rounded-2xl border border-dashed border-border-default bg-surface-raised p-6 text-center">
                <p class="text-sm text-text-secondary">
                  @if (role() === 'owner') {
                    Aún no tenés reservas como propietario.
                  } @else {
                    Aún no tenés reservas activas.
                  }
                </p>
                <a
                  [routerLink]="role() === 'owner' ? '/cars/publish' : '/cars'"
                  appPressScale
                  class="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cta-default text-cta-text text-sm font-semibold hover:bg-cta-hover transition-colors"
                >
                  <app-icon [name]="role() === 'owner' ? 'plus' : 'search'" [size]="16" />
                  <span>
                    @if (role() === 'owner') { Publicar auto } @else { Explorar autos }
                  </span>
                </a>
              </div>
            } @else {
              <div class="space-y-3">
                @for (booking of sortedBookings(); track booking.id) {
                  <article
                    class="rounded-2xl border border-border-default bg-surface-raised p-4 shadow-sm border-l-4"
                    [class]="statusBorderClass(booking)"
                  >
                    <div class="flex gap-3">
                      <div
                        class="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-surface-secondary flex-shrink-0"
                      >
                        @if (booking.main_photo_url) {
                          <img
                            [src]="booking.main_photo_url"
                            [alt]="booking.car_title || 'Auto'"
                            loading="lazy"
                            class="w-full h-full object-cover"
                            width="80"
                            height="80"
                          />
                        } @else {
                          <div class="w-full h-full flex items-center justify-center text-text-secondary/50">
                            <app-icon name="car-outline" [size]="24" />
                          </div>
                        }
                      </div>

                      <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-3">
                          <div class="min-w-0">
                            <p class="text-xs text-text-secondary uppercase tracking-wide">
                              {{ role() === 'owner' ? 'Tu auto' : 'Auto reservado' }}
                            </p>
                            <h3 class="text-base font-semibold text-text-primary truncate">
                              {{ booking.car_title || 'Auto' }}
                            </h3>
                            <p class="text-xs text-text-secondary mt-1">
                              {{ rangeLabel(booking) }} · {{ timelineLabel(booking) }}
                            </p>
                            @if (booking.car_city || booking.car_province) {
                              <p class="text-xs text-text-secondary/70">
                                {{ booking.car_city || '' }}{{
                                  booking.car_city && booking.car_province ? ', ' : ''
                                }}{{ booking.car_province || '' }}
                              </p>
                            }
                          </div>
                          <span
                            class="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold"
                            [class]="statusChipClass(booking)"
                          >
                            {{ statusLabel(booking) }}
                          </span>
                        </div>

                        <div class="mt-3 flex items-center justify-between gap-3">
                          <div class="text-sm font-semibold text-text-primary">
                            {{ booking.total_amount | money }}
                          </div>
                          <div class="flex items-center gap-2">
                            @if (primaryActionLabel(booking); as label) {
                              <a
                                [routerLink]="primaryActionLink(booking)"
                                [queryParams]="primaryActionQuery(booking)"
                                appPressScale
                                class="px-3 py-2 rounded-xl bg-cta-default text-cta-text text-xs font-semibold hover:bg-cta-hover transition-colors"
                              >
                                {{ label }}
                              </a>
                            }
                            <a
                              [routerLink]="detailLink(booking)"
                              appPressScale
                              class="px-3 py-2 rounded-xl border border-border-default text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-cta-default transition-colors"
                            >
                              Ver detalle
                            </a>
                          </div>
                        </div>

                        <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                          <div class="inline-flex items-center gap-1">
                            <app-icon name="calendar" [size]="12" />
                            <span>{{ timelineLabel(booking) }}</span>
                          </div>
                          <span class="h-1 w-1 rounded-full bg-text-secondary/40"></span>
                          <div class="inline-flex items-center gap-1">
                            <app-icon name="credit-card" [size]="12" />
                            <span>{{ paymentModeLabel(booking) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                }
              </div>
            }
          </section>
        }
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: var(--surface-primary);
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

  readonly todayLabel = computed(() => {
    const now = new Date();
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }).format(now);
  });

  readonly roleLabel = computed(() =>
    this.role() === 'owner' ? 'Modo propietario' : 'Modo arrendatario',
  );

  readonly renterSummary = computed(() => {
    const bookings = this.myBookings();
    return {
      active: bookings.filter((b) => this.isActive(b)).length,
      upcoming: bookings.filter((b) => this.isWithinNext24h(b.start_at)).length,
      pending: bookings.filter((b) => this.isPendingRenter(b)).length,
    };
  });

  readonly ownerSummary = computed(() => {
    const bookings = this.ownerBookings();
    const approvalsFallback = bookings.filter(
      (b) => b.status === 'pending' && !!b.payment_mode,
    ).length;
    return {
      approvals: this.pendingApprovals() ?? approvalsFallback,
      active: bookings.filter((b) => this.isActive(b)).length,
      review: bookings.filter((b) => b.status === 'pending_review').length,
    };
  });

  readonly summaryItems = computed(() => {
    if (this.role() === 'owner') {
      const summary = this.ownerSummary();
      return [
        {
          id: 'approvals',
          label: 'Aprobaciones',
          value: summary.approvals,
          icon: 'user-check',
          iconClass: 'bg-warning-bg text-warning-strong',
        },
        {
          id: 'active',
          label: 'En curso',
          value: summary.active,
          icon: 'car-outline',
          iconClass: 'bg-success-bg text-success-strong',
        },
        {
          id: 'review',
          label: 'En revisión',
          value: summary.review,
          icon: 'eye',
          iconClass: 'bg-info-bg text-info-strong',
        },
      ];
    }

    const summary = this.renterSummary();
    return [
      {
        id: 'active',
        label: 'En curso',
        value: summary.active,
        icon: 'car-outline',
        iconClass: 'bg-success-bg text-success-strong',
      },
      {
        id: 'upcoming',
        label: 'Próximas 24h',
        value: summary.upcoming,
        icon: 'calendar',
        iconClass: 'bg-info-bg text-info-strong',
      },
      {
        id: 'pending',
        label: 'Pendientes',
        value: summary.pending,
        icon: 'alert-triangle',
        iconClass: 'bg-warning-bg text-warning-strong',
      },
    ];
  });

  readonly summaryHint = computed(() =>
    this.role() === 'owner' ? 'Tus autos hoy' : 'Tus viajes hoy',
  );

  readonly insightItems = computed<InsightItem[]>(() => {
    if (this.role() === 'owner') {
      const bookings = this.ownerBookings();
      return [
        {
          id: 'revenue',
          label: 'Ingresos',
          value: this.sumLast30Days(bookings),
          type: 'money',
        },
        {
          id: 'total',
          label: 'Reservas',
          value: bookings.length,
          type: 'count',
        },
        {
          id: 'next',
          label: 'Próxima entrega',
          value: this.nextTripLabel(bookings),
          type: 'text',
        },
      ];
    }

    const bookings = this.myBookings();
    return [
      {
        id: 'spent',
        label: 'Gasto',
        value: this.sumLast30Days(bookings),
        type: 'money',
      },
      {
        id: 'total',
        label: 'Viajes',
        value: bookings.length,
        type: 'count',
      },
      {
        id: 'next',
        label: 'Próximo viaje',
        value: this.nextTripLabel(bookings),
        type: 'text',
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
          label: 'Aprobaciones',
          count: bookings.filter((b) => this.isPendingOwnerApproval(b)).length,
        },
        {
          id: 'review',
          label: 'Revisión',
          count: bookings.filter((b) => b.status === 'pending_review').length,
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
        id: 'upcoming',
        label: 'Próximas',
        count: bookings.filter((b) => this.isUpcoming(b)).length,
      },
      {
        id: 'history',
        label: 'Historial',
        count: bookings.filter((b) => this.isHistory(b)).length,
      },
    ];
  });

  readonly currentFilterLabel = computed(() => {
    const current = this.filters().find((item) => item.id === this.filter());
    return current ? `Reservas · ${current.label}` : 'Reservas';
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
        toneClass: 'bg-surface-secondary text-text-secondary',
        booking: null,
      };
    }

    const badge = this.statusLabel(focus);
    const actionLabel = this.primaryActionLabel(focus);
    const actionLink = actionLabel ? this.primaryActionLink(focus) : this.detailLink(focus);

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
      toneClass: this.statusChipClass(focus),
      booking: focus,
    };
  });

  readonly quickActions = computed<QuickAction[]>(() => {
    if (this.role() === 'owner') {
      return [
        {
          id: 'publish',
          label: 'Publicar auto',
          icon: 'plus',
          link: '/cars/publish',
        },
        {
          id: 'approvals',
          label: 'Aprobaciones',
          icon: 'user-check',
          link: '/bookings/pending-approval',
          badge: this.pendingApprovals() ?? 0,
        },
        {
          id: 'messages',
          label: 'Consultas',
          icon: 'message-circle',
          link: '/messages',
        },
      ];
    }

    return [
      {
        id: 'explore',
        label: 'Explorar autos',
        icon: 'search',
        link: '/cars',
      },
      {
        id: 'messages',
        label: 'Mensajes',
        icon: 'message-circle',
        link: '/messages',
      },
      {
        id: 'history',
        label: 'Historial',
        icon: 'calendar',
        link: '/bookings/list',
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
        if (filter === 'review') return booking.status === 'pending_review';
        if (filter === 'active') return this.isActive(booking);
        if (filter === 'history') return this.isHistory(booking);
        return true;
      }

      if (filter === 'action') return this.isPendingRenter(booking);
      if (filter === 'active') return this.isActive(booking);
      if (filter === 'upcoming') return this.isUpcoming(booking);
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
        this.statusLabel(booking),
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

  readonly upcomingBookings = computed(() => {
    const bookings = this.role() === 'owner' ? this.ownerBookings() : this.myBookings();
    const now = Date.now();
    return bookings
      .filter((booking) => {
        const moment = this.timelineMoment(booking);
        if (!moment) return false;
        return new Date(moment).getTime() >= now;
      })
      .sort((a, b) => {
        const aMoment = this.timelineMoment(a) ?? a.start_at ?? '';
        const bMoment = this.timelineMoment(b) ?? b.start_at ?? '';
        return new Date(aMoment).getTime() - new Date(bMoment).getTime();
      })
      .slice(0, 3);
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

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.searchTerm.set(target?.value ?? '');
  }

  toggleSort(): void {
    this.sortMode.set(this.sortMode() === 'priority' ? 'date' : 'priority');
  }

  sortLabel(): string {
    return this.sortMode() === 'priority' ? 'Prioridad' : 'Fecha';
  }

  rangeLabel(booking: Booking): string {
    return formatDateRange(booking.start_at, booking.end_at);
  }

  statusLabel(booking: Booking): string {
    const status = booking.status;
    if (status === 'pending_payment') return 'Pago en proceso';
    if (status === 'pending') {
      if (this.role() === 'owner') {
        return booking.payment_mode ? 'Aprobar' : 'Pago pendiente';
      }
      return booking.payment_mode === 'wallet' ? 'Esperando aprobación' : 'Pendiente de pago';
    }
    if (status === 'pending_review') return 'En revisión';
    if (status === 'confirmed') return 'Confirmada';
    if (status === 'in_progress') return 'En curso';
    if (status === 'completed') return 'Finalizada';
    if (status === 'cancelled') return 'Cancelada';
    if (status === 'expired') return 'Vencida';
    return 'Actualizando';
  }

  statusChipClass(booking: Booking): string {
    const status = booking.status;
    if (status === 'pending' || status === 'pending_payment') {
      return 'bg-warning-bg text-warning-strong';
    }
    if (status === 'pending_review') {
      return 'bg-info-bg text-info-strong';
    }
    if (status === 'confirmed' || status === 'in_progress') {
      return 'bg-success-bg text-success-strong';
    }
    if (status === 'completed') {
      return 'bg-surface-secondary text-text-secondary';
    }
    return 'bg-error-bg text-error-strong';
  }

  statusBorderClass(booking: Booking): string {
    const status = booking.status;
    if (status === 'pending' || status === 'pending_payment') {
      return 'border-l-warning-500';
    }
    if (status === 'pending_review') {
      return 'border-l-info-500';
    }
    if (status === 'confirmed' || status === 'in_progress') {
      return 'border-l-success-500';
    }
    if (status === 'completed') {
      return 'border-l-border-default';
    }
    return 'border-l-error-500';
  }

  paymentModeLabel(booking: Booking): string {
    if (booking.payment_mode === 'wallet') return 'Wallet';
    if (booking.payment_mode === 'card') return 'Tarjeta';
    if (booking.status === 'pending_payment') return 'Procesando pago';
    return 'Pago estándar';
  }

  primaryActionLabel(booking: Booking): string | null {
    if (this.role() === 'owner') {
      if (booking.status === 'pending' && booking.payment_mode) {
        return 'Aprobar';
      }
      if (booking.status === 'pending_review') {
        return 'Revisar';
      }
      return null;
    }

    if (this.canCompletePay(booking)) {
      return 'Completar pago';
    }
    return null;
  }

  primaryActionLink(booking: Booking): string[] {
    if (this.role() === 'owner') {
      if (booking.status === 'pending' && booking.payment_mode) {
        return ['/bookings/pending-approval'];
      }
      if (booking.status === 'pending_review') {
        return ['/bookings/pending-review'];
      }
      return this.detailLink(booking);
    }
    return ['/bookings/request'];
  }

  primaryActionQuery(booking: Booking): Record<string, string> | null {
    if (this.role() === 'owner') {
      return null;
    }
    return { bookingId: booking.id };
  }

  detailLink(booking: Booking): string[] {
    return this.role() === 'owner' ? ['/bookings/owner', booking.id] : ['/bookings', booking.id];
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

  private isWithinNext24h(dateStr?: string): boolean {
    if (!dateStr) return false;
    const now = Date.now();
    const ts = new Date(dateStr).getTime();
    return ts >= now && ts <= now + 24 * 60 * 60 * 1000;
  }

  private isUpcoming(booking: Booking): boolean {
    if (!booking.start_at) return false;
    const now = Date.now();
    const ts = new Date(booking.start_at).getTime();
    const windowMs = 7 * 24 * 60 * 60 * 1000;
    return ts >= now && ts <= now + windowMs && !this.isHistory(booking);
  }

  private isHistory(booking: Booking): boolean {
    return ['completed', 'cancelled', 'expired'].includes(booking.status);
  }

  timelineLabel(booking: Booking): string {
    const moment = this.timelineMoment(booking);
    if (!moment) return 'Sin fecha';
    const relative = formatRelativeTime(moment);
    const time = formatTime(moment);
    if (booking.status === 'in_progress' || booking.status === 'confirmed') {
      return `Finaliza ${relative} · ${time}`;
    }
    return `Comienza ${relative} · ${time}`;
  }

  private timelineMoment(booking: Booking): string | null {
    if (booking.status === 'in_progress' && booking.end_at) return booking.end_at;
    return booking.start_at ?? null;
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
      if (this.isUpcoming(booking)) return 4;
      if (this.isHistory(booking)) return 6;
      return 5;
    }

    if (this.canCompletePay(booking)) return 1;
    if (booking.status === 'pending_review') return 2;
    if (this.isActive(booking)) return 3;
    if (this.isUpcoming(booking)) return 4;
    if (this.isHistory(booking)) return 6;
    return 5;
  }

  private sumLast30Days(bookings: Booking[]): number {
    const now = Date.now();
    const windowMs = 30 * 24 * 60 * 60 * 1000;
    return bookings.reduce((acc, booking) => {
      if (!booking.start_at) return acc;
      const ts = new Date(booking.start_at).getTime();
      if (ts >= now - windowMs && ts <= now) {
        return acc + (booking.total_amount ?? 0);
      }
      return acc;
    }, 0);
  }

  private nextTripLabel(bookings: Booking[]): string {
    const upcoming = bookings
      .filter((booking) => booking.start_at && !this.isHistory(booking))
      .sort(
        (a, b) =>
          new Date(a.start_at ?? '').getTime() - new Date(b.start_at ?? '').getTime(),
      )[0];
    if (!upcoming?.start_at) return '—';
    return formatRelativeTime(upcoming.start_at);
  }

  private isStartDatePassed(booking: Booking): boolean {
    if (!booking.start_at) return false;
    return new Date(booking.start_at).getTime() < Date.now();
  }

  private isWalletBooking(booking: Booking): boolean {
    return booking.payment_mode === 'wallet';
  }

  private canCompletePay(booking: Booking): boolean {
    if (this.isWalletBooking(booking)) return false;
    const pendingStatus = booking.status === 'pending' || booking.status === 'pending_payment';
    return pendingStatus && !this.isStartDatePassed(booking);
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
