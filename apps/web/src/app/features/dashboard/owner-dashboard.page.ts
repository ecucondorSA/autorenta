import { CommonModule } from '@angular/common';
import {Component, computed, inject, OnDestroy, OnInit, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import type { DashboardStats } from '@core/models/dashboard.model';
import { DashboardService } from '@core/services/admin/dashboard.service';
import { NotificationsService } from '@core/services/infrastructure/user-notifications.service';
import { MissingDocumentsWidgetComponent } from '../../shared/components/missing-documents-widget/missing-documents-widget.component';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { MultiCarCalendarComponent } from './components/multi-car-calendar/multi-car-calendar.component';
import { PayoutsHistoryComponent } from './components/payouts-history/payouts-history.component';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-owner-dashboard',
  imports: [
    CommonModule,
    RouterLink,
    MoneyPipe,
    TranslateModule,
    MultiCarCalendarComponent,
    MissingDocumentsWidgetComponent,
    PayoutsHistoryComponent,
  ],
  templateUrl: './owner-dashboard.page.html',
  styleUrls: ['./owner-dashboard.page.css'],
})
export class OwnerDashboardPage implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly notificationsService = inject(NotificationsService);

  // P0-006 FIX: Memory leak prevention
  private readonly destroy$ = new Subject<void>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly showCalendar = signal(false);

  // Dashboard stats from Edge Function
  readonly stats = signal<DashboardStats | null>(null);

  // Wallet computed signals
  readonly availableBalance = computed(() => this.stats()?.wallet.availableBalance ?? 0);
  readonly pendingBalance = computed(() => this.stats()?.wallet.lockedBalance ?? 0);
  readonly totalBalance = computed(() => this.stats()?.wallet.totalBalance ?? 0);
  readonly withdrawableBalance = computed(() => this.stats()?.wallet.withdrawableBalance ?? 0);

  // Cars computed signals
  readonly totalCars = computed(() => this.stats()?.cars.total ?? 0);
  readonly activeCars = computed(() => this.stats()?.cars.active ?? 0);
  readonly pendingCars = computed(() => this.stats()?.cars.pending ?? 0);
  readonly suspendedCars = computed(() => this.stats()?.cars.suspended ?? 0);

  // Bookings computed signals
  readonly upcomingBookings = computed(() => this.stats()?.bookings.upcoming ?? 0);
  readonly activeBookings = computed(() => this.stats()?.bookings.active ?? 0);
  readonly completedBookings = computed(() => this.stats()?.bookings.completed ?? 0);
  readonly totalBookings = computed(() => this.stats()?.bookings.total ?? 0);

  // Earnings computed signals
  readonly thisMonthEarnings = computed(() => this.stats()?.earnings.thisMonth ?? 0);
  readonly lastMonthEarnings = computed(() => this.stats()?.earnings.lastMonth ?? 0);
  readonly totalEarnings = computed(() => this.stats()?.earnings.total ?? 0);

  // Growth percentage calculation
  readonly growthPercentage = computed(() => {
    const current = this.thisMonthEarnings();
    const previous = this.lastMonthEarnings();
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  });

  readonly isGrowthPositive = computed(() => this.growthPercentage() >= 0);

  // Notifications computed signals
  readonly notifications = this.notificationsService.notifications;
  readonly unreadCount = this.notificationsService.unreadCount;
  readonly recentNotifications = computed(
    () => this.notifications().slice(0, 5), // Last 5 notifications
  );

  async ngOnInit() {
    await this.loadDashboardData();
    // Notifications are loaded automatically by the service
  }

  getRetryAction() {
    return {
      label: 'Reintentar',
      handler: () => this.loadDashboardData(),
      variant: 'primary' as const,
    };
  }

  async loadDashboardData(forceRefresh: boolean = false) {
    this.loading.set(true);
    this.error.set(null);

    // P0-006 FIX: Prevent memory leak with takeUntil
    this.dashboardService
      .getDashboardStats(forceRefresh)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.stats.set(stats);
          this.loading.set(false);
        },
        error: (_err) => {
          this.error.set('No pudimos cargar las estadísticas. Intentá de nuevo.');
          this.loading.set(false);
        },
      });
  }

  /**
   * Refresh dashboard data manually
   * Clears cache and fetches fresh data
   */
  refreshDashboard(): void {
    this.dashboardService.clearCache();
    this.loadDashboardData(true);
  }

  toggleCalendar(): void {
    this.showCalendar.set(!this.showCalendar());
  }

  ngOnDestroy(): void {
    // P0-006 FIX: Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }
}
