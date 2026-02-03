import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  walletOutline,
  timeOutline,
  trendingUpOutline,
  statsChartOutline,
  calculatorOutline,
  cashOutline,
  receiptOutline,
  gridOutline,
  chevronForwardOutline,
  informationCircleOutline,
  flashOutline,
  analyticsOutline,
} from 'ionicons/icons';
import type { DashboardStats } from '@core/models/dashboard.model';
import { CarsService } from '@core/services/cars/cars.service';
import { DashboardService } from '@core/services/admin/dashboard.service';
import { ExchangeRateService } from '@core/services/payments/exchange-rate.service';
import { PressScaleDirective } from '@shared/directives/press-scale.directive';
import type { Car } from '../../../core/models';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { formatDate } from '../../../shared/utils/date.utils';

@Component({
  selector: 'app-earnings-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MoneyPipe, IonIcon, PressScaleDirective],
  templateUrl: './earnings.page.html',
  styleUrls: ['./earnings.page.css'],
})
export class EarningsPage implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly carsService = inject(CarsService);
  private readonly exchangeRateService = inject(ExchangeRateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly stats = signal<DashboardStats | null>(null);
  readonly cars = signal<Car[]>([]);
  readonly exchangeRate = signal<number>(1000);

  constructor() {
    addIcons({
      walletOutline,
      timeOutline,
      trendingUpOutline,
      statsChartOutline,
      calculatorOutline,
      cashOutline,
      receiptOutline,
      gridOutline,
      chevronForwardOutline,
      informationCircleOutline,
      flashOutline,
      analyticsOutline,
    });
  }

  formatDashboardDate(date?: string | Date | null): string {
    if (!date) return '-';
    return formatDate(date, { format: 'medium' });
  }

  readonly availableBalance = computed(() => this.stats()?.wallet.availableBalance ?? 0);
  readonly pendingBalance = computed(() => this.stats()?.wallet.lockedBalance ?? 0);
  readonly totalEarnings = computed(() => this.stats()?.earnings.total ?? 0);
  readonly thisMonthEarnings = computed(() => this.stats()?.earnings.thisMonth ?? 0);
  readonly lastMonthEarnings = computed(() => this.stats()?.earnings.lastMonth ?? 0);

  readonly growthPercentage = computed(() => {
    const current = this.thisMonthEarnings();
    const previous = this.lastMonthEarnings();
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  });

  readonly isGrowthPositive = computed(() => this.growthPercentage() >= 0);

  readonly totalAnnualDepreciation = computed(() => {
    const userCars = this.cars();
    let total = 0;
    for (const car of userCars) {
      const valueUsd = car.value_usd || 0;
      if (valueUsd > 0) {
        let depreciationRate = 0.15;
        total += valueUsd * depreciationRate;
      }
    }
    return total;
  });

  readonly breakevenDays = computed(() => {
    const annualDepreciation = this.totalAnnualDepreciation();
    const userCars = this.cars();
    if (annualDepreciation === 0 || userCars.length === 0) return 0;
    let totalDailyIncome = 0;
    for (const car of userCars) {
      totalDailyIncome += (car.price_per_day || 0) * 0.70;
    }
    return totalDailyIncome === 0 ? 0 : Math.ceil(annualDepreciation / totalDailyIncome);
  });

  readonly profitStartDate = computed(() => {
    const days = this.breakevenDays();
    if (days === 0) return null;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + days);
    return startDate;
  });

  readonly months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  readonly depreciationChartData = signal<{ month: string; value: number; percentage: number }[]>([]);
  readonly incomeChartData = signal<{ month: string; value: number; percentage: number }[]>([]);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadData(), this.loadCars(), this.loadExchangeRate()]);
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.dashboardService.getDashboardStats(false).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.updateCharts();
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar datos');
        this.loading.set(false);
      }
    });
  }

  async loadCars(): Promise<void> {
    try {
      const cars = await this.carsService.listMyCars();
      this.cars.set(cars);
      this.updateCharts();
    } catch (error) {
      console.error('Error loading cars:', error);
    }
  }

  async loadExchangeRate(): Promise<void> {
    try {
      const rate = await this.exchangeRateService.getPlatformRate();
      this.exchangeRate.set(rate);
    } catch {
      this.exchangeRate.set(1000);
    }
  }

  private updateCharts(): void {
    const annualDepreciation = this.totalAnnualDepreciation();
    const monthlyDepreciation = annualDepreciation / 12;
    const monthlyIncome = this.thisMonthEarnings() || 500;
    const depreciationData: { month: string; value: number; percentage: number }[] = [];
    const incomeData: { month: string; value: number; percentage: number }[] = [];

    for (let i = 0; i < 12; i++) {
      const depValue = Math.round(monthlyDepreciation * (i + 1));
      const incValue = Math.round(monthlyIncome * (i + 1));
      depreciationData.push({
        month: this.months[i],
        value: depValue,
        percentage: annualDepreciation > 0 ? (depValue / annualDepreciation) * 100 : 0,
      });
      incomeData.push({
        month: this.months[i],
        value: incValue,
        percentage: (monthlyIncome * 12) > 0 ? (incValue / (monthlyIncome * 12)) * 100 : 0,
      });
    }
    this.depreciationChartData.set(depreciationData);
    this.incomeChartData.set(incomeData);
  }
}