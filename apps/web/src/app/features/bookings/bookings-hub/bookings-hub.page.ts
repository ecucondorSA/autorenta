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
import { IonIcon } from '@ionic/angular/standalone';
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
} from 'ionicons/icons';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import type { Booking } from '@core/models';
import { BookingsStore } from '@core/stores/bookings.store';
import { PressScaleDirective } from '@shared/directives/press-scale.directive';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { formatDateRange, formatRelativeTime } from '@shared/utils/date.utils';

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
  icon: string;
  booking: Booking | null;
}

interface InsightItem {
  id: string;
  label: string;
  value: number | string;
  type: 'money' | 'count' | 'text';
  icon: string;
}

/**
 * BookingsHubPage - V3.0 Premium Redesign
 *
 * Implements Bento Grid layouts, Cinematic headers, and Defensive UI.
 * Standardized for High-Conversion Marketplaces.
 */
@Component({
  standalone: true,
  selector: 'app-bookings-hub',
  imports: [CommonModule, RouterLink, IonIcon, MoneyPipe, PressScaleDirective],
  template: `
    <div class="min-h-screen bg-surface-base pb-32">
      <!-- 1. CINEMATIC STICKY HEADER -->
      <header class="sticky top-0 z-30 bg-surface-base/80 backdrop-blur-xl border-b border-border-muted px-4 py-4 sm:px-6">
        <div class="container-page flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-premium-sm">
                <ion-icon name="person-outline"></ion-icon>
              </div>
              <div>
                <h1 class="text-xl font-bold text-text-primary tracking-tight font-sans">
                  Hola, {{ userName() }}
                </h1>
                <p class="text-[10px] uppercase font-black tracking-widest text-text-muted">
                  {{ roleLabel() }} · {{ todayLabel() }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button appPressScale class="w-10 h-10 rounded-full bg-surface-secondary flex items-center justify-center text-text-secondary relative">
                <ion-icon name="notifications-outline"></ion-icon>
                <span class="absolute top-2.5 right-2.5 w-2 h-2 bg-cta-default rounded-full ring-2 ring-surface-base"></span>
              </button>
            </div>
          </div>

          <!-- ROLE SWITCHER (Segmented Control) -->
          <div class="p-1 bg-surface-secondary rounded-2xl flex items-center shadow-inner max-w-sm">
            <button
              (click)="setRole('renter')"
              [class.bg-white]="role() === 'renter'"
              [class.shadow-premium-sm]="role() === 'renter'"
              [class.text-text-primary]="role() === 'renter'"
              class="flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all duration-300 text-text-muted"
            >
              Arrendatario
            </button>
            <button
              (click)="setRole('owner')"
              [class.bg-white]="role() === 'owner'"
              [class.shadow-premium-sm]="role() === 'owner'"
              [class.text-text-primary]="role() === 'owner'"
              class="flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all duration-300 text-text-muted"
            >
              Propietario
            </button>
          </div>
        </div>
      </header>

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
          <section class="space-y-4">
            <div class="flex items-center justify-between px-1">
              <h2 class="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                <ion-icon name="flash-outline" class="text-cta-default"></ion-icon>
                En Foco
              </h2>
            </div>

            @if (focusCard().booking; as focusBooking) {
              <div 
                appPressScale
                [routerLink]="detailLink(focusBooking)"
                class="group relative overflow-hidden rounded-3xl border border-border-muted bg-white shadow-premium-md hover:shadow-premium-lg transition-all duration-500 p-6 sm:p-8"
              >
                <!-- Cinematic Background Pattern -->
                <div class="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full -mr-20 -mt-20 blur-3xl"></div>
                
                <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div class="space-y-4 max-w-xl">
                    <span 
                      class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border"
                      [class]="focusCard().toneClass"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse"></span>
                      {{ focusCard().badge }}
                    </span>
                    
                    <div>
                      <h3 class="text-2xl sm:text-3xl font-black text-text-primary tracking-tight leading-tight">
                        {{ focusCard().title }}
                      </h3>
                      <p class="text-text-secondary font-medium mt-1">{{ focusCard().subtitle }}</p>
                    </div>

                    <div class="flex flex-wrap items-center gap-4 text-xs font-medium text-text-muted">
                      <div class="flex items-center gap-1.5">
                        <ion-icon name="calendar-outline"></ion-icon>
                        <span>{{ rangeLabel(focusBooking) }}</span>
                      </div>
                      <div class="flex items-center gap-1.5">
                        <ion-icon name="time-outline"></ion-icon>
                        <span>{{ timelineLabel(focusBooking) }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col items-start md:items-end gap-4">
                    <div class="text-3xl font-black text-text-primary font-mono tracking-tighter">
                      {{ focusBooking.total_amount | money }}
                    </div>
                    <button class="w-full md:w-auto px-6 py-3 bg-cta-default text-cta-text rounded-2xl font-black text-sm shadow-premium-hover hover:bg-cta-hover transition-all">
                      {{ focusCard().actionLabel }}
                    </button>
                  </div>
                </div>
              </div>
            } @else {
              <!-- EMPTY STATE FOCUS -->
              <div class="rounded-3xl border border-dashed border-border-muted bg-surface-secondary/30 p-12 text-center flex flex-col items-center">
                <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-premium-sm mb-4">
                  <ion-icon name="shield-checkmark-outline" class="text-3xl text-emerald-500"></ion-icon>
                </div>
                <h3 class="text-lg font-black text-text-primary tracking-tight">Todo en orden</h3>
                <p class="text-sm text-text-secondary mt-1 max-w-xs">No hay tareas urgentes en este momento. Te avisaremos si algo requiere tu atención.</p>
                @if (role() === 'renter') {
                  <a routerLink="/marketplace" class="mt-6 text-cta-default font-black text-xs uppercase tracking-widest hover:underline">
                    Explorar Autos →
                  </a>
                }
              </div>
            }
          </section>

          <!-- 3. INSIGHTS BENTO GRID -->
          <section class="space-y-4">
            <div class="flex items-center justify-between px-1">
              <h2 class="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                <ion-icon name="grid-outline" class="text-indigo-500"></ion-icon>
                Indicadores
              </h2>
              <span class="text-[10px] font-bold text-text-muted italic">Últimos 30 días</span>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              @for (item of insightItems(); track item.id) {
                <div class="bg-surface-secondary/50 rounded-3xl p-5 border border-border-muted hover:bg-white hover:shadow-premium-md transition-all duration-300 group">
                  <div class="flex flex-col h-full justify-between gap-4">
                    <div class="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-text-muted group-hover:text-cta-default shadow-sm transition-colors">
                      <ion-icon [name]="item.icon"></ion-icon>
                    </div>
                    <div>
                      <p class="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">{{ item.label }}</p>
                      <div class="text-2xl font-black text-text-primary font-mono tracking-tighter">
                        @if (item.type === 'money') {
                          {{ $any(item.value) | money }}
                        } @else {
                          {{ item.value }}
                        }
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          </section>

          <!-- 4. QUICK ACTIONS -->
          <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
            @for (action of quickActions(); track action.id) {
              <a
                [routerLink]="action.link"
                [queryParams]="action.query"
                appPressScale
                class="flex items-center justify-between p-5 bg-white rounded-2xl border border-border-muted shadow-premium-sm hover:shadow-premium-md transition-all group"
              >
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-cta-default group-hover:text-cta-text transition-colors">
                    <ion-icon [name]="action.icon" class="text-xl"></ion-icon>
                  </div>
                  <span class="text-sm font-black text-text-primary">{{ action.label }}</span>
                </div>
                @if (action.badge && action.badge > 0) {
                  <span class="bg-cta-default text-cta-text text-[10px] font-black px-2 py-1 rounded-lg animate-pulse">
                    {{ action.badge }}
                  </span>
                } @else {
                  <ion-icon name="chevron-forward-outline" class="text-text-muted group-hover:translate-x-1 transition-transform"></ion-icon>
                }
              </a>
            }
          </section>

          <!-- 5. RESERVAS LIST (The Marketplace Standard) -->
          <section class="space-y-6 pt-4">
            <header class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 class="text-2xl font-black text-text-primary tracking-tight">Tus Reservas</h2>
                <p class="text-sm text-text-secondary mt-1">Gestioná todos tus movimientos</p>
              </div>
              
              <!-- FILTER TABS -->
              <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                @for (filterItem of filters(); track filterItem.id) {
                  <button
                    (click)="setFilter(filterItem.id)"
                    [class.bg-text-primary]="filter() === filterItem.id"
                    [class.text-white]="filter() === filterItem.id"
                    [class.bg-surface-secondary]="filter() !== filterItem.id"
                    [class.text-text-muted]="filter() !== filterItem.id"
                    class="px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap"
                  >
                    {{ filterItem.label }} ({{ filterItem.count }})
                  </button>
                }
              </div>
            </header>

            @if (filteredBookings().length === 0) {
              <!-- DEFENSIVE EMPTY STATE -->
              <div class="py-20 flex flex-col items-center justify-center text-center">
                <div class="w-24 h-24 text-text-muted/20 mb-6">
                  <ion-icon name="car-sport-outline" class="text-8xl"></ion-icon>
                </div>
                <h3 class="text-xl font-black text-text-primary">No hay resultados</h3>
                <p class="text-sm text-text-secondary mt-2 max-w-xs mx-auto">Aún no tenés reservas que coincidan con estos criterios.</p>
                <button (click)="setFilter('all')" class="mt-6 text-xs font-black uppercase tracking-widest text-indigo-600 hover:underline">
                  Ver todas las reservas
                </button>
              </div>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                @for (booking of sortedBookings(); track booking.id) {
                  <article
                    appPressScale
                    [routerLink]="detailLink(booking)"
                    class="group flex flex-col bg-white rounded-3xl border border-border-muted shadow-premium-sm hover:shadow-premium-lg transition-all duration-500 overflow-hidden"
                  >
                    <!-- Thumbnail Header -->
                    <div class="relative h-48 w-full bg-surface-secondary overflow-hidden">
                      @if (booking.main_photo_url) {
                        <img
                          [src]="booking.main_photo_url"
                          [alt]="booking.car_title || 'Auto'"
                          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      } @else {
                        <div class="w-full h-full flex items-center justify-center text-text-muted/30">
                          <ion-icon name="car-sport-outline" class="text-6xl"></ion-icon>
                        </div>
                      }
                      <!-- Status Floating Badge -->
                      <div class="absolute top-4 left-4">
                        <span class="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/90 backdrop-blur-md shadow-premium-sm border border-white/20"
                              [class]="statusChipClass(booking)">
                          {{ statusLabel(booking) }}
                        </span>
                      </div>
                    </div>

                    <!-- Article Body -->
                    <div class="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div class="flex justify-between items-start gap-2 mb-1">
                          <h3 class="text-lg font-black text-text-primary tracking-tight truncate">
                            {{ booking.car_title || 'Auto' }}
                          </h3>
                          <span class="text-sm font-black text-text-primary font-mono">{{ booking.total_amount | money }}</span>
                        </div>
                        <p class="text-xs text-text-secondary font-medium">{{ rangeLabel(booking) }}</p>
                        <p class="text-[10px] text-text-muted mt-1 uppercase tracking-wider font-bold">
                          <ion-icon name="location-outline" class="mr-1"></ion-icon>
                          {{ booking.car_city || 'Ubicación' }}
                        </p>
                      </div>

                      <div class="pt-4 border-t border-border-muted flex items-center justify-between">
                        <div class="flex -space-x-2">
                           <!-- Avatars placeholder -->
                           <div class="w-6 h-6 rounded-full border-2 border-white bg-slate-200"></div>
                           <div class="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center">
                             <ion-icon name="person-outline" class="text-[10px]"></ion-icon>
                           </div>
                        </div>
                        <button class="text-[10px] font-black uppercase tracking-widest text-cta-default group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          Detalle <ion-icon name="chevron-forward-outline"></ion-icon>
                        </button>
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
        background: var(--surface-base);
      }
      .animate-fade-in-up {
        animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
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
    });
  }

  readonly userName = computed(() => {
    const profile = inject(AuthService).session$()?.user;
    return profile?.email?.split('@')[0] || 'Usuario';
  });

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

  rangeLabel(booking: Booking): string {
    return formatDateRange(booking.start_at, booking.end_at);
  }

  statusLabel(booking: Booking): string {
    const status = booking.status;
    if (status === 'pending_payment') return 'En Pago';
    if (status === 'pending') {
      return this.role() === 'owner' ? 'Por Aprobar' : 'Pendiente';
    }
    if (status === 'pending_review') return 'En Revisión';
    if (status === 'confirmed') return 'Confirmada';
    if (status === 'in_progress') return 'En Viaje';
    if (status === 'completed') return 'Finalizada';
    if (status === 'cancelled') return 'Cancelada';
    return status;
  }

  statusChipClass(booking: Booking): string {
    const status = booking.status;
    if (status === 'pending' || status === 'pending_payment') {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (status === 'pending_review') {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (status === 'confirmed' || status === 'in_progress') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    return 'bg-slate-50 text-slate-600 border-slate-200';
  }

  primaryActionLabel(booking: Booking): string | null {
    if (this.role() === 'owner') {
      if (booking.status === 'pending' && booking.payment_mode) return 'Revisar Solicitud';
      if (booking.status === 'pending_review') return 'Finalizar';
      return null;
    }
    if (this.canCompletePay(booking)) return 'Pagar Ahora';
    return null;
  }

  primaryActionLink(booking: Booking): string[] {
    if (this.role() === 'owner') {
      if (booking.status === 'pending') return ['/bookings/pending-approval'];
      if (booking.status === 'pending_review') return ['/bookings/pending-review'];
      return this.detailLink(booking);
    }
    return ['/bookings/request'];
  }

  primaryActionQuery(booking: Booking): Record<string, string> | null {
    return this.role() === 'owner' ? null : { bookingId: booking.id };
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

  private isHistory(booking: Booking): boolean {
    return ['completed', 'cancelled', 'expired'].includes(booking.status);
  }

  timelineLabel(booking: Booking): string {
    const moment = this.timelineMoment(booking);
    if (!moment) return 'Sin fecha';
    return formatRelativeTime(moment);
  }

  private timelineMoment(booking: Booking): string | null {
    return booking.status === 'in_progress' ? booking.end_at : (booking.start_at ?? null);
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