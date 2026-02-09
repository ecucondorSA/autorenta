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
import { BookingUiService, BookingRole, BookingPriority } from '@core/services/bookings/booking-ui.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { BookingsStore } from '@core/stores/bookings.store';
import { addIcons } from 'ionicons';
import {
  carSportOutline,
  searchOutline,
  addOutline,
  alertCircleOutline,
  keyOutline,
  filterOutline
} from 'ionicons/icons';

import { IonIcon } from '@ionic/angular/standalone';
import { BookingsHeaderComponent } from './components/bookings-header.component';
import { BookingsFocusCardComponent } from './components/bookings-focus-card.component';
import { BookingsInsightsComponent } from './components/bookings-insights.component';
import { BookingsQuickActionsComponent } from './components/bookings-quick-actions.component';
import { BookingsListComponent } from './components/bookings-list.component';
import { InsightItem, BookingQuickAction } from './bookings-hub.types';

type HubFilter = 'all' | 'action' | 'active' | 'history';

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
    <div class="min-h-screen bg-slate-50 pb-24 safe-area-bottom">
      
      <!-- HEADER & CONTEXT SWITCH -->
      <app-bookings-header
        [role]="role()"
        (roleChange)="setRole($event)"
      ></app-bookings-header>

      <main class="px-4 pt-6 space-y-8 max-w-lg mx-auto">

        <!-- LOADING SKELETON -->
        @if (loading()) {
          <div class="space-y-6 animate-pulse">
            <!-- Focus Card Skeleton -->
            <div class="h-64 bg-slate-200 rounded-3xl w-full"></div>
            <!-- Insights Skeleton -->
            <div class="grid grid-cols-3 gap-3">
              <div class="h-20 bg-slate-200 rounded-xl"></div>
              <div class="h-20 bg-slate-200 rounded-xl"></div>
              <div class="h-20 bg-slate-200 rounded-xl"></div>
            </div>
            <!-- List Skeleton -->
            <div class="space-y-3">
              <div class="h-24 bg-slate-200 rounded-2xl w-full"></div>
              <div class="h-24 bg-slate-200 rounded-2xl w-full"></div>
            </div>
          </div>
        }

        <!-- ERROR STATE -->
        @else if (hasError()) {
          <div class="flex flex-col items-center justify-center py-24 text-center">
            <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-500">
              <ion-icon name="alert-circle-outline" class="text-3xl"></ion-icon>
            </div>
            <h3 class="text-lg font-bold text-slate-900">Algo salió mal</h3>
            <p class="text-sm text-slate-500 mb-6 max-w-[200px]">No pudimos cargar tus reservas. Por favor intentá nuevamente.</p>
            <button (click)="retry()" class="text-sm font-semibold text-slate-900 underline">
              Reintentar
            </button>
          </div>
        }

        <!-- EMPTY STATE (No Bookings at all) -->
        @else if (allBookings().length === 0) {
          <div class="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
            <div class="relative mb-6">
              <div class="absolute inset-0 bg-indigo-100 rounded-full scale-150 opacity-20 animate-ping"></div>
              <div class="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center relative z-10">
                <ion-icon 
                  [name]="role() === 'owner' ? 'key-outline' : 'car-sport-outline'" 
                  class="text-4xl text-slate-400">
                </ion-icon>
              </div>
            </div>

            <h3 class="text-xl font-bold text-slate-900 mb-2">
              {{ role() === 'owner' ? 'Sin reservas aún' : 'Empezá tu viaje' }}
            </h3>
            <p class="text-sm text-slate-500 max-w-[240px] mb-8 leading-relaxed">
              {{ role() === 'owner' 
                ? 'Tus autos aparecerán acá cuando recibas reservas.' 
                : 'Descubrí autos increíbles y viví la experiencia AutoRenta.' }}
            </p>

            @if (role() === 'renter') {
              <a routerLink="/marketplace" 
                 class="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-900/20 active:scale-95 transition-transform">
                Explorar Autos
              </a>
            } @else {
              <a routerLink="/cars/publish" 
                 class="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-900/20 active:scale-95 transition-transform">
                Publicar Auto
              </a>
            }
          </div>
        }

        <!-- CONTENT -->
        @else {
          
          <!-- FOCUS SECTION: "What needs attention?" -->
          @if (focusBooking()) {
            <section class="animate-in slide-in-from-bottom-4 duration-500">
              <div class="flex items-center gap-2 mb-3 px-1">
                <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <h2 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Acción Requerida</h2>
              </div>
              <app-bookings-focus-card
                [booking]="focusBooking()"
                [role]="role()"
              ></app-bookings-focus-card>
            </section>
          }

          <!-- INSIGHTS & METRICS -->
          <app-bookings-insights [items]="insights()"></app-bookings-insights>

          <!-- QUICK ACTIONS GRID -->
          <app-bookings-quick-actions [actions]="quickActions()"></app-bookings-quick-actions>

          <!-- FILTER TABS -->
          <div class="sticky top-0 z-20 bg-slate-50/95 backdrop-blur py-2 -mx-4 px-4 border-b border-slate-100">
            <div class="flex gap-2 overflow-x-auto no-scrollbar">
              @for (f of filters(); track f.id) {
                <button 
                  (click)="setFilter(f.id)"
                  class="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border"
                  [class]="filter() === f.id 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'">
                  {{ f.label }} 
                  <span class="ml-1 opacity-60 text-[10px]">{{ f.count }}</span>
                </button>
              }
            </div>
          </div>

          <!-- BOOKINGS LIST -->
          <div class="space-y-3 pb-8 min-h-[300px]">
            @if (visibleBookings().length > 0) {
              <app-bookings-list
                [bookings]="visibleBookings()"
                [role]="role()"
              ></app-bookings-list>
            } @else {
              <div class="py-12 text-center">
                <p class="text-sm text-slate-400 font-medium">No hay reservas en esta categoría.</p>
              </div>
            }
          </div>

        }
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingsHubPage implements OnInit, OnDestroy {
  private readonly store = inject(BookingsStore);
  private readonly authService = inject(AuthService);
  private readonly bookingsService = inject(BookingsService);
  private readonly uiService = inject(BookingUiService);

  // -- STATE --
  readonly loading = this.store.loadingList;
  readonly role = signal<BookingRole>('renter');
  readonly filter = signal<HubFilter>('all');
  readonly hasError = signal(false);
  readonly pendingApprovals = signal<number>(0);

  // -- DATA SOURCE --
  // We use "allBookings" as the raw source based on role
  readonly allBookings = computed(() => 
    this.role() === 'owner' ? this.store.ownerBookings() : this.store.myBookings()
  );

  constructor() {
    addIcons({ 
      carSportOutline, searchOutline, addOutline, alertCircleOutline, keyOutline, filterOutline 
    });
  }

  // -- COMPUTED: FOCUS --
  /**
   * The single most important booking requiring attention.
   * Priority logic is centralized in BookingUiService.
   */
  readonly focusBooking = computed(() => {
    const bookings = this.allBookings();
    if (!bookings.length) return null;

    // Sort by priority (Urgent > Active > Info > Neutral)
    const sorted = [...bookings].sort((a, b) => {
      const pA = this.getPriorityScore(this.uiService.getPriority(a, this.role()));
      const pB = this.getPriorityScore(this.uiService.getPriority(b, this.role()));
      return pB - pA; // Descending (Higher score = higher priority)
    });

    const top = sorted[0];
    const topPriority = this.uiService.getPriority(top, this.role());

    // Only show Focus Card if Urgent or Active (ignore Info/Neutral)
    if (topPriority === 'urgent' || topPriority === 'active') {
      return top;
    }
    return null;
  });

  // -- COMPUTED: FILTERS --
  readonly filters = computed(() => {
    const list = this.allBookings();
    return [
      { id: 'all', label: 'Todas', count: list.length },
      { id: 'action', label: 'Acción', count: list.filter(b => this.uiService.getPriority(b, this.role()) === 'urgent').length },
      { id: 'active', label: 'Activas', count: list.filter(b => this.uiService.getPriority(b, this.role()) === 'active').length },
      { id: 'history', label: 'Historial', count: list.filter(b => ['completed', 'cancelled'].includes(b.status)).length } // Simplified
    ] as { id: HubFilter, label: string, count: number }[];
  });

  // -- COMPUTED: VISIBLE LIST --
  readonly visibleBookings = computed(() => {
    const list = this.allBookings();
    const currentFilter = this.filter();
    const focusId = this.focusBooking()?.id;

    // Filter logic
    let filtered = list;
    if (currentFilter === 'action') {
      filtered = list.filter(b => this.uiService.getPriority(b, this.role()) === 'urgent');
    } else if (currentFilter === 'active') {
      filtered = list.filter(b => this.uiService.getPriority(b, this.role()) === 'active');
    } else if (currentFilter === 'history') {
      filtered = list.filter(b => this.uiService.getPriority(b, this.role()) === 'neutral');
    }

    // Exclude the focus booking from the list to avoid duplication
    if (focusId && currentFilter === 'all') {
      return filtered.filter(b => b.id !== focusId);
    }
    
    return filtered;
  });

  // -- COMPUTED: INSIGHTS --
  readonly insights = computed<InsightItem[]>(() => {
    const bookings = this.allBookings();
    const active = bookings.filter(b => this.uiService.getPriority(b, this.role()) === 'active').length;
    const urgent = bookings.filter(b => this.uiService.getPriority(b, this.role()) === 'urgent').length;
    
    // Example money calc (simplified)
    const totalSpent = bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);

    return [
      { id: 'active', label: 'En Curso', value: active, type: 'count', icon: 'rocket-outline' },
      { id: 'urgent', label: 'Pendientes', value: urgent, type: 'count', icon: 'alert-circle-outline' },
      { id: 'spent', label: this.role() === 'owner' ? 'Ganancias' : 'Invertido', value: totalSpent, type: 'money', icon: 'wallet-outline' }
    ];
  });

  // -- COMPUTED: QUICK ACTIONS --
  readonly quickActions = computed<BookingQuickAction[]>(() => {
    if (this.role() === 'owner') {
      return [
        { id: 'publish', label: 'Publicar', icon: 'add-outline', link: '/cars/publish' },
        { id: 'messages', label: 'Mensajes', icon: 'chatbubble-ellipses-outline', link: '/messages' },
      ];
    }
    return [
      { id: 'explore', label: 'Explorar', icon: 'search-outline', link: '/marketplace' },
      { id: 'messages', label: 'Mensajes', icon: 'chatbubble-ellipses-outline', link: '/messages' },
    ];
  });

  // -- LIFECYCLE --
  async ngOnInit() {
    this.hasError.set(false);
    try {
      await Promise.all([this.store.loadMyBookings(), this.store.loadOwnerBookings()]);
      this.subscribeRealtime();
    } catch {
      this.hasError.set(true);
    }
  }

  ngOnDestroy() {
    this.store.unsubscribeAll();
  }

  // -- ACTIONS --
  setRole(role: BookingRole) {
    this.role.set(role);
    this.filter.set('all'); // Reset filter on role change
  }

  setFilter(filter: string) {
    this.filter.set(filter as HubFilter);
  }

  async retry() {
    this.hasError.set(false);
    try {
      await Promise.all([
        this.store.loadMyBookings({ force: true }), 
        this.store.loadOwnerBookings({ force: true })
      ]);
    } catch {
      this.hasError.set(true);
    }
  }

  // -- HELPERS --
  private getPriorityScore(priority: BookingPriority): number {
    switch (priority) {
      case 'urgent': return 4;
      case 'active': return 3;
      case 'info': return 2;
      case 'neutral': return 1;
      default: return 0;
    }
  }

  private async subscribeRealtime() {
    const session = await this.authService.ensureSession();
    if (session?.user?.id) {
      this.store.subscribeToUserBookings('renter');
      this.store.subscribeToUserBookings('owner');
    }
  }
}