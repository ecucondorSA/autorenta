import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { WalletService } from '../../core/services/wallet.service';
import { BookingsService } from '../../core/services/bookings.service';
import { CarsService } from '../../core/services/cars.service';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { MultiCarCalendarComponent } from './components/multi-car-calendar/multi-car-calendar.component';
import { MissingDocumentsWidgetComponent } from '../../shared/components/missing-documents-widget/missing-documents-widget.component';
import { PayoutsHistoryComponent } from './components/payouts-history/payouts-history.component';

interface EarningsSummary {
  thisMonth: number;
  lastMonth: number;
  total: number;
}

@Component({
  standalone: true,
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
export class OwnerDashboardPage implements OnInit {
  private readonly walletService = inject(WalletService);
  private readonly bookingsService = inject(BookingsService);
  private readonly carsService = inject(CarsService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly showCalendar = signal(false);

  // Balance del wallet
  readonly availableBalance = computed(() => this.walletService.availableBalance());
  readonly pendingBalance = computed(() => this.walletService.lockedBalance());
  readonly totalEarnings = computed(() => this.walletService.totalBalance());

  // Caching with TTL (5 minutes)
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  private cacheTimestamp = 0;

  // Estadísticas
  readonly totalCars = signal(0);
  readonly activeCars = signal(0);
  readonly upcomingBookings = signal(0);
  readonly activeBookings = signal(0);
  readonly completedBookings = signal(0);

  readonly earnings = signal<EarningsSummary>({
    thisMonth: 0,
    lastMonth: 0,
    total: 0,
  });

  async ngOnInit() {
    await this.loadDashboardData();
  }

  async loadDashboardData() {
    // Check cache validity (5-minute TTL)
    const now = Date.now();
    if (this.cacheTimestamp > 0 && now - this.cacheTimestamp < this.CACHE_TTL) {
      // Cache is still valid, skip reload
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      // Load all data in parallel for ~50% faster load time
      const [, cars, bookings] = await Promise.all([
        this.walletService.getBalance(),
        this.carsService.listMyCars(),
        this.bookingsService.getOwnerBookings(),
      ]);

      // Update car statistics
      this.totalCars.set(cars.length);
      this.activeCars.set(cars.filter((c) => c.status === 'active').length);

      // Update booking statistics
      this.upcomingBookings.set(
        bookings.filter((b) => b.status === 'confirmed' && new Date(b.start_at) > new Date())
          .length,
      );
      this.activeBookings.set(bookings.filter((b) => b.status === 'in_progress').length);
      this.completedBookings.set(bookings.filter((b) => b.status === 'completed').length);

      // Calculate earnings (client-side for now, TODO: move to Edge Function)
      this.calculateEarnings(bookings);

      // Update cache timestamp
      this.cacheTimestamp = Date.now();
    } catch (_err) {
      this.error.set('No pudimos cargar las estadísticas. Intentá de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Calculate earnings from bookings
   * TODO: Move this to Edge Function for better performance and scalability
   */
  private calculateEarnings(bookings: any[]): void {
    const now = new Date();

    const thisMonth = bookings
      .filter((b) => {
        if (!b.updated_at) return false;
        const completedDate = new Date(b.updated_at);
        return (
          b.status === 'completed' &&
          completedDate.getMonth() === now.getMonth() &&
          completedDate.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);

    const lastMonth = bookings
      .filter((b) => {
        if (!b.updated_at) return false;
        const completedDate = new Date(b.updated_at);
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
        return (
          b.status === 'completed' &&
          completedDate.getMonth() === lastMonthDate.getMonth() &&
          completedDate.getFullYear() === lastMonthDate.getFullYear()
        );
      })
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);

    const total = bookings
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);

    this.earnings.set({ thisMonth, lastMonth, total });
  }

  get growthPercentage(): number {
    const current = this.earnings().thisMonth;
    const previous = this.earnings().lastMonth;
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  get isGrowthPositive(): boolean {
    return this.growthPercentage >= 0;
  }

  toggleCalendar(): void {
    this.showCalendar.set(!this.showCalendar());
  }
}
