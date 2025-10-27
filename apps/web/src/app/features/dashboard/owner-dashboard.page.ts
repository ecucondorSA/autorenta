import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { WalletService } from '../../core/services/wallet.service';
import { BookingsService } from '../../core/services/bookings.service';
import { CarsService } from '../../core/services/cars.service';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

interface EarningsSummary {
  thisMonth: number;
  lastMonth: number;
  total: number;
}

@Component({
  standalone: true,
  selector: 'app-owner-dashboard',
  imports: [CommonModule, RouterLink, MoneyPipe, TranslateModule],
  templateUrl: './owner-dashboard.page.html',
  styleUrls: ['./owner-dashboard.page.css']
})
export class OwnerDashboardPage implements OnInit {
  private readonly walletService = inject(WalletService);
  private readonly bookingsService = inject(BookingsService);
  private readonly carsService = inject(CarsService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  
  // Balance del wallet
  readonly availableBalance = computed(() => this.walletService.availableBalance());
  readonly pendingBalance = computed(() => this.walletService.lockedBalance());
  readonly totalEarnings = computed(() => this.walletService.totalBalance());
  
  // Estadísticas
  readonly totalCars = signal(0);
  readonly activeCars = signal(0);
  readonly upcomingBookings = signal(0);
  readonly activeBookings = signal(0);
  readonly completedBookings = signal(0);
  
  readonly earnings = signal<EarningsSummary>({
    thisMonth: 0,
    lastMonth: 0,
    total: 0
  });

  async ngOnInit() {
    await this.loadDashboardData();
  }

  async loadDashboardData() {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Cargar balance del wallet
      await this.walletService.getBalance();

      // Cargar estadísticas de autos
      const cars = await this.carsService.listMyCars();
      this.totalCars.set(cars.length);
      this.activeCars.set(cars.filter(c => c.status === 'active').length);

      // Cargar estadísticas de reservas
      const bookings = await this.bookingsService.getOwnerBookings();
      this.upcomingBookings.set(
        bookings.filter(b => b.status === 'confirmed' && new Date(b.start_at) > new Date()).length
      );
      this.activeBookings.set(
        bookings.filter(b => b.status === 'in_progress').length
      );
      this.completedBookings.set(
        bookings.filter(b => b.status === 'completed').length
      );

      // Calcular ganancias por mes
      const now = new Date();
      const thisMonth = bookings
        .filter(b => {
          if (!b.updated_at) return false;
          const completedDate = new Date(b.updated_at);
          return b.status === 'completed' &&
            completedDate.getMonth() === now.getMonth() &&
            completedDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);

      const lastMonth = bookings
        .filter(b => {
          if (!b.updated_at) return false;
          const completedDate = new Date(b.updated_at);
          const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
          return b.status === 'completed' &&
            completedDate.getMonth() === lastMonthDate.getMonth() &&
            completedDate.getFullYear() === lastMonthDate.getFullYear();
        })
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);

      const total = bookings
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);

      this.earnings.set({ thisMonth, lastMonth, total });

    } catch (err) {
      console.error('Error loading dashboard:', err);
      this.error.set('No pudimos cargar las estadísticas. Intentá de nuevo.');
    } finally {
      this.loading.set(false);
    }
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
}
