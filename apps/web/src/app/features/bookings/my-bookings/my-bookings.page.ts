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
import { Router, RouterLink } from '@angular/router';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { TranslateModule } from '@ngx-translate/core';
import { IonicModule } from '@ionic/angular';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { BookingRealtimeService } from '@core/services/bookings/booking-realtime.service';
import {
  BookingUiService,
  BookingUiState,
  BookingCardAction,
} from '@core/services/bookings/booking-ui.service';
import { AuthService } from '@core/services/auth/auth.service';
import { ToastService } from '@core/services/ui/toast.service';
// UI 2026 Directives
import { PressScaleDirective } from '@shared/directives/press-scale.directive';
import { Booking } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { formatDateRange } from '../../../shared/utils/date.utils';
import {
  BookingActionCardComponent,
  BookingActionCardData,
} from '../../../shared/components/booking-action-card/booking-action-card.component';
import { BookingStatusBadgeComponent } from '../../../shared/components/booking-status-badge/booking-status-badge.component';
import { TripProgressBarComponent } from '../../../shared/components/trip-progress-bar/trip-progress-bar.component';
import {
  BookingStatusFilter,
  BookingSection,
  STATUS_FILTERS,
  INITIAL_SECTIONS,
} from './my-bookings.config';

/** A booking enriched with precomputed UI state for the template. */
interface InboxBooking {
  booking: Booking;
  ui: BookingUiState;
  cardData: BookingActionCardData;
}

/** A section rendered in the inbox. */
interface InboxSection {
  id: string;
  title: string;
  icon: string;
  expanded: boolean;
  variant: 'full' | 'compact';
  items: InboxBooking[];
  count: number;
}

@Component({
  standalone: true,
  selector: 'app-my-bookings-page',
  imports: [
    CommonModule,
    IonicModule,
    MoneyPipe,
    RouterLink,
    ScrollingModule,
    TranslateModule,
    IconComponent,
    PressScaleDirective,
    BookingActionCardComponent,
    BookingStatusBadgeComponent,
    TripProgressBarComponent,
  ],
  templateUrl: './my-bookings.page.html',
  styleUrl: './my-bookings.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyBookingsPage implements OnInit, OnDestroy {
  private readonly bookingsService = inject(BookingsService);
  private readonly bookingUiService = inject(BookingUiService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly bookingRealtimeService = inject(BookingRealtimeService);
  private readonly authService = inject(AuthService);

  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly statusFilter = signal<BookingStatusFilter>('all');
  private currentUserId: string | null = null;

  // Collapsible sections state
  readonly sections = signal<BookingSection[]>(INITIAL_SECTIONS);

  // Filtros disponibles
  readonly statusFilters = STATUS_FILTERS;

  // ─── Computed: Enriched Inbox Bookings ────────────────────────────────────

  private readonly enrichedBookings = computed<InboxBooking[]>(() => {
    const allBookings = this.bookings();
    return allBookings.map(booking => {
      const ui = this.bookingUiService.getUiState(booking);
      const cardData = this.toCardData(booking, ui);
      return { booking, ui, cardData };
    });
  });

  // ─── Computed: Inbox Sections ─────────────────────────────────────────────

  readonly inboxSections = computed<InboxSection[]>(() => {
    const enriched = this.enrichedBookings();
    const filter = this.statusFilter();
    const sectionDefs = this.sections();

    // Pre-create buckets
    const sectionBuckets = new Map<string, InboxBooking[]>();
    for (const section of sectionDefs) {
      sectionBuckets.set(section.id, []);
    }

    // Single pass assignment
    for (const item of enriched) {
      const effectiveStatus = this.bookingUiService.getEffectiveStatus(item.booking);

      // Filter logic
      if (filter !== 'all' && effectiveStatus !== filter) continue;

      // Assign to section
      for (const section of sectionDefs) {
        if (section.statuses.includes(effectiveStatus)) {
          sectionBuckets.get(section.id)!.push(item);
          break;
        }
      }
    }

    // Sort: urgent items first within each section
    const priorityOrder = { urgent: 0, active: 1, info: 2, neutral: 3 };
    for (const [, items] of sectionBuckets) {
      items.sort((a, b) => priorityOrder[a.ui.priority] - priorityOrder[b.ui.priority]);
    }

    return sectionDefs.map(section => {
      const items = sectionBuckets.get(section.id) ?? [];
      const sectionVariant: 'full' | 'compact' = section.id === 'history' ? 'compact' : 'full';
      return {
        ...section,
        variant: sectionVariant,
        items,
        count: items.length,
      };
    });
  });

  // ─── Computed: Dashboard Stats ────────────────────────────────────────────

  readonly statusCounts = computed(() => {
    const bookings = this.bookings();
    const counts: Record<string, number> = { all: bookings.length };

    STATUS_FILTERS.forEach(f => { if (f !== 'all') counts[f] = 0; });
    counts['expired'] = 0;

    for (const booking of bookings) {
      const status = this.bookingUiService.getEffectiveStatus(booking);
      if (counts[status] !== undefined) {
        counts[status]++;
      } else {
        counts[status] = 1;
      }
    }
    return counts;
  });

  readonly dashboardStats = computed(() => {
    const counts = this.statusCounts();
    return {
      actionRequired: (counts['pending'] || 0) + (counts['pending_review'] || 0)
        + (counts['pending_return'] || 0) + (counts['damage_reported'] || 0),
      active: (counts['confirmed'] || 0) + (counts['in_progress'] || 0),
      history: (counts['completed'] || 0) + (counts['cancelled'] || 0) + (counts['expired'] || 0),
      total: counts['all'] || 0,
    };
  });

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    void this.loadBookings();
    void this.setupRealtimeSubscription();
  }

  ngOnDestroy(): void {
    this.bookingRealtimeService.unsubscribeUserBookings();
  }

  private async setupRealtimeSubscription(): Promise<void> {
    const session = await this.authService.ensureSession();
    this.currentUserId = session?.user?.id ?? null;
    if (this.currentUserId) {
      this.bookingRealtimeService.subscribeToUserBookings(this.currentUserId, 'renter', {
        onBookingsChange: () => {
          void this.loadBookings();
        },
      });
    }
  }

  async loadBookings(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const { bookings } = await this.bookingsService.getMyBookings();
      this.bookings.set(bookings);
    } catch {
      this.error.set('No pudimos cargar tus reservas. Por favor intentá de nuevo más tarde.');
    } finally {
      this.loading.set(false);
    }
  }

  // ─── Template Helpers ─────────────────────────────────────────────────────

  rangeLabel(booking: Booking): string {
    return formatDateRange(booking.start_at, booking.end_at);
  }

  getFilterLabel(filter: BookingStatusFilter): string {
    const labelMap: Record<string, string> = {
      all: 'Todas',
      pending: 'Pendientes',
      confirmed: 'Confirmadas',
      in_progress: 'En Curso',
      completed: 'Completadas',
      cancelled: 'Canceladas',
      pending_review: 'En Revisión',
    };
    return labelMap[filter] ?? filter;
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  setStatusFilter(filter: BookingStatusFilter): void {
    this.statusFilter.set(filter);
  }

  toggleSection(sectionId: string): void {
    const currentSections = this.sections();
    const updatedSections = currentSections.map(section =>
      section.id === sectionId ? { ...section, expanded: !section.expanded } : section,
    );
    this.sections.set(updatedSections);
  }

  focusSection(sectionId: string): void {
    this.statusFilter.set('all');
    const updatedSections = this.sections().map(section => ({
      ...section,
      expanded: section.id === sectionId,
    }));
    this.sections.set(updatedSections);
  }

  expandAllSections(): void {
    const currentSections = this.sections();
    this.sections.set(currentSections.map(s => ({ ...s, expanded: true })));
  }

  onCardClick(bookingId: string): void {
    void this.router.navigate(['/bookings', bookingId]);
  }

  onActionClick(action: BookingCardAction): void {
    void this.router.navigate([action.route]);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private toCardData(booking: Booking, ui: BookingUiState): BookingActionCardData {
    const amount = booking.total_amount ?? 0;
    return {
      id: booking.id,
      ui,
      carImage: booking.main_photo_url ?? booking.car_image ?? null,
      carTitle: booking.car_title ?? [booking.car_brand, booking.car_model, booking.car_year].filter(Boolean).join(' '),
      dateRange: formatDateRange(booking.start_at, booking.end_at),
      totalDisplay: this.formatMoney(amount),
      counterpartyName: booking.owner_name,
      counterpartyAvatar: booking.owner_avatar,
    };
  }

  private formatMoney(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}