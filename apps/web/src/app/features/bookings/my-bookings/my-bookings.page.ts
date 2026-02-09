import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { TranslateModule } from '@ngx-translate/core';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { BookingRealtimeService } from '@core/services/bookings/booking-realtime.service';
import { AuthService } from '@core/services/auth/auth.service';
import { ToastService } from '@core/services/ui/toast.service';
// UI 2026 Directives
import { PressScaleDirective } from '@shared/directives/press-scale.directive';
import { Booking } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { formatDateRange } from '../../../shared/utils/date.utils';
import {
  STATUS_CONFIG,
  DEFAULT_STATUS_CONFIG,
  BookingStatusFilter,
  BookingSection,
  STATUS_FILTERS,
  INITIAL_SECTIONS,
  StatusConfig
} from './my-bookings.config';

@Component({
  standalone: true,
  selector: 'app-my-bookings-page',
  imports: [
    CommonModule,
    MoneyPipe,
    RouterLink,
    ScrollingModule,
    TranslateModule,
    IconComponent,
    PressScaleDirective,
  ],
  templateUrl: './my-bookings.page.html',
  styleUrl: './my-bookings.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyBookingsPage implements OnInit, OnDestroy {
  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly statusFilter = signal<BookingStatusFilter>('all');
  private currentUserId: string | null = null;

  // Collapsible sections state
  readonly sections = signal<BookingSection[]>(INITIAL_SECTIONS);

  // Filtros disponibles
  readonly statusFilters = STATUS_FILTERS;

  // Computed: Bookings grouped by section
  readonly bookingsBySection = computed(() => {
    const allBookings = this.bookings();
    const filter = this.statusFilter();
    const sectionList = this.sections();

    // Pre-create buckets
    const sectionBuckets = new Map<string, Booking[]>();
    for (const section of sectionList) {
      sectionBuckets.set(section.id, []);
    }

    // Single pass
    for (const booking of allBookings) {
      const effectiveStatus = this.getEffectiveStatus(booking);

      // Filter logic
      if (filter !== 'all' && effectiveStatus !== filter) continue;

      // Assign to section
      for (const section of sectionList) {
        if (section.statuses.includes(effectiveStatus)) {
          sectionBuckets.get(section.id)!.push(booking);
          break;
        }
      }
    }

    // Build result
    return sectionList.map((section) => {
      const bookings = sectionBuckets.get(section.id) ?? [];
      return {
        ...section,
        bookings,
        count: bookings.length,
      };
    });
  });

  // Computed: Count stats
  readonly statusCounts = computed(() => {
    const bookings = this.bookings();
    const counts: Record<string, number> = { all: bookings.length };
    
    // Initialize specific counts
    STATUS_FILTERS.forEach(f => { if(f !== 'all') counts[f] = 0; });
    counts['expired'] = 0; // Add expired as it's a derived status

    for (const booking of bookings) {
      const status = this.getEffectiveStatus(booking);
      if (counts[status] !== undefined) {
        counts[status]++;
      } else {
         // Fallback initialization
         counts[status] = 1;
      }
    }

    return counts;
  });

  // Computed: Dashboard Summary
  readonly dashboardStats = computed(() => {
    const counts = this.statusCounts();
    return {
      actionRequired: (counts['pending'] || 0) + (counts['pending_review'] || 0),
      active: (counts['confirmed'] || 0) + (counts['in_progress'] || 0),
      history: (counts['completed'] || 0) + (counts['cancelled'] || 0) + (counts['expired'] || 0),
      total: counts['all'] || 0,
    };
  });

  constructor(
    private readonly bookingsService: BookingsService,
    private readonly router: Router,
    private readonly toastService: ToastService,
    private readonly bookingRealtimeService: BookingRealtimeService,
    private readonly authService: AuthService,
  ) {}

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

  rangeLabel(booking: Booking): string {
    return formatDateRange(booking.start_at, booking.end_at);
  }

  getEffectiveStatus(booking: Booking): string {
    if ((booking.status === 'pending_payment' || booking.status === 'pending') && this.isStartDatePassed(booking)) {
      return 'expired';
    }
    if (booking.status === 'pending_payment') {
      return 'pending';
    }
    return booking.status;
  }

  isStartDatePassed(booking: Booking): boolean {
    if (!booking.start_at) return false;
    const startDate = new Date(booking.start_at);
    const now = new Date();
    return startDate < now;
  }

  private getStatusConfig(booking: Booking): StatusConfig {
    const effectiveStatus = this.getEffectiveStatus(booking);
    return STATUS_CONFIG[effectiveStatus] ?? DEFAULT_STATUS_CONFIG;
  }

  // --- Helper Methods exposed to Template ---

  statusLabel(booking: Booking): string {
    return this.getStatusConfig(booking).label;
  }

  statusLabelShort(booking: Booking): string {
    return this.getStatusConfig(booking).labelShort;
  }
  
  statusIcon(booking: Booking): string {
    return this.getStatusConfig(booking).icon;
  }

  statusBadgeCompactClass(booking: Booking): string {
    return this.getStatusConfig(booking).badgeCompactClass;
  }
  
  statusBorderClass(booking: Booking): string {
    return this.getStatusConfig(booking).borderClass;
  }
  
  statusIconBgClass(booking: Booking): string {
    return this.getStatusConfig(booking).iconBgClass;
  }

  getFilterLabel(filter: BookingStatusFilter): string {
    if (filter === 'all') return 'Todas';
    return STATUS_CONFIG[filter]?.filterLabel ?? filter;
  }

  // --- Logic Checks ---

  isWalletBooking(booking: Booking): boolean {
    return booking.payment_mode === 'wallet';
  }

  canCompletePay(booking: Booking): boolean {
    if (this.isWalletBooking(booking)) return false;
    const pendingStatus = booking.status === 'pending' || booking.status === 'pending_payment';
    return pendingStatus && !this.isStartDatePassed(booking);
  }

  isPendingApproval(booking: Booking): boolean {
    return (
      booking.status === 'pending' &&
      this.isWalletBooking(booking) &&
      !this.isStartDatePassed(booking)
    );
  }

  isPendingReview(booking: Booking): boolean {
    return booking.status === 'pending_review';
  }

  // --- Actions ---

  setStatusFilter(filter: BookingStatusFilter): void {
    this.statusFilter.set(filter);
  }

  toggleSection(sectionId: string): void {
    const currentSections = this.sections();
    const updatedSections = currentSections.map((section) =>
      section.id === sectionId ? { ...section, expanded: !section.expanded } : section,
    );
    this.sections.set(updatedSections);
  }

  focusSection(sectionId: string): void {
    this.statusFilter.set('all');
    const updatedSections = this.sections().map((section) => ({
      ...section,
      expanded: section.id === sectionId,
    }));
    this.sections.set(updatedSections);
  }

  expandAllSections(): void {
    const currentSections = this.sections();
    this.sections.set(currentSections.map((s) => ({ ...s, expanded: true })));
  }
}