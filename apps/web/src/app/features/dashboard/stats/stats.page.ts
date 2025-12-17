import {Component, OnInit, signal, computed, inject,
  ChangeDetectionStrategy, DestroyRef} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { RouterLink } from '@angular/router';
import { DashboardService } from '../../../core/services/dashboard.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import type { DashboardStats } from '../../../core/models/dashboard.model';

@Component({
  selector: 'app-stats-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MoneyPipe],
  templateUrl: './stats.page.html',
  styleUrls: ['./stats.page.css'],
})
export class StatsPage implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly stats = signal<DashboardStats | null>(null);

  // Computed signals
  readonly totalCars = computed(() => this.stats()?.cars.total ?? 0);
  readonly activeCars = computed(() => this.stats()?.cars.active ?? 0);
  readonly pendingCars = computed(() => this.stats()?.cars.pending ?? 0);
  readonly suspendedCars = computed(() => this.stats()?.cars.suspended ?? 0);

  readonly upcomingBookings = computed(() => this.stats()?.bookings.upcoming ?? 0);
  readonly activeBookings = computed(() => this.stats()?.bookings.active ?? 0);
  readonly completedBookings = computed(() => this.stats()?.bookings.completed ?? 0);
  readonly totalBookings = computed(() => this.stats()?.bookings.total ?? 0);

  readonly thisMonthEarnings = computed(() => this.stats()?.earnings.thisMonth ?? 0);
  readonly lastMonthEarnings = computed(() => this.stats()?.earnings.lastMonth ?? 0);
  readonly totalEarnings = computed(() => this.stats()?.earnings.total ?? 0);

  readonly availableBalance = computed(() => this.stats()?.wallet.availableBalance ?? 0);
  readonly pendingBalance = computed(() => this.stats()?.wallet.lockedBalance ?? 0);

  readonly occupancyRate = computed(() => {
    const total = this.totalCars();
    const active = this.activeCars();
    if (total === 0) return 0;
    return Math.round((active / total) * 100);
  });

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    this.dashboardService.getDashboardStats(false).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
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
}
