import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import type { Car } from '../../../core/models';
import type { DashboardStats } from '../../../core/models/dashboard.model';
import { CarsService } from '../../../core/services/cars.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { ExchangeRateService } from '../../../core/services/exchange-rate.service';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-earnings-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MoneyPipe, BaseChartDirective, DatePipe],
  templateUrl: './earnings.page.html',
  styleUrls: ['./earnings.page.css'],
})
export class EarningsPage implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly carsService = inject(CarsService);
  private readonly exchangeRateService = inject(ExchangeRateService);
  private readonly supabaseService = inject(SupabaseClientService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly stats = signal<DashboardStats | null>(null);
  readonly cars = signal<Car[]>([]);
  readonly exchangeRate = signal<number>(1000); // Default ARS/USD rate
  readonly carCategories = signal<Map<string, { depreciation_rate_annual: number }>>(new Map());

  // Computed signals
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

  // Depreciation and breakeven calculations
  readonly totalAnnualDepreciation = computed(() => {
    const userCars = this.cars();

    let total = 0;

    for (const car of userCars) {
      const valueUsd = car.value_usd || 0;
      if (valueUsd > 0) {
        // Obtener tasa de depreciación de la categoría o usar default
        let depreciationRate = 0.15; // 15% anual (default)
        // Note: category_id is not part of Car interface, using default depreciation rate
        const annualDepreciation = valueUsd * depreciationRate;
        total += annualDepreciation * this.exchangeRate(); // Convert to ARS
      }
    }

    return total;
  });

  readonly totalAnnualIncome = computed(() => {
    // Estimación basada en ganancias mensuales * 12
    const monthlyEarnings = this.thisMonthEarnings();
    return monthlyEarnings * 12;
  });

  readonly breakevenDays = computed(() => {
    const annualDepreciation = this.totalAnnualDepreciation();
    const userCars = this.cars();

    if (annualDepreciation === 0 || userCars.length === 0) return 0;

    // Calcular ingreso diario promedio por auto
    let totalDailyIncome = 0;
    for (const car of userCars) {
      // Owner recibe 85% del precio diario (split payment)
      const dailyIncome = (car.price_per_day || 0) * 0.85;
      totalDailyIncome += dailyIncome;
    }

    if (totalDailyIncome === 0) return 0;

    // Días necesarios para cubrir depreciación anual
    return Math.ceil(annualDepreciation / totalDailyIncome);
  });

  readonly profitStartDate = computed(() => {
    const days = this.breakevenDays();
    if (days === 0) return null;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + days);
    return startDate;
  });

  // Chart configurations
  depreciationChartData: ChartData<'line'> = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    datasets: [
      {
        label: 'Depreciación Acumulada (ARS)',
        data: [],
        borderColor: 'rgb(239, 68, 68)', // Red
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  incomeChartData: ChartData<'line'> = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    datasets: [
      {
        label: 'Ingresos Acumulados (ARS)',
        data: [],
        borderColor: 'rgb(34, 197, 94)', // Green
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return new Intl.NumberFormat('es-AR', {
              style: 'currency',
              currency: 'ARS',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(Number(value));
          },
        },
      },
    },
  };

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadData(), this.loadCars(), this.loadExchangeRate()]);
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    this.dashboardService.getDashboardStats(false).subscribe({
      next: (stats) => {
        this.stats.set(stats);
        // Actualizar gráficos después de que todos los datos estén cargados
        setTimeout(() => {
          this.updateCharts();
        }, 100);
        this.loading.set(false);
      },
      error: (_err) => {
        this.error.set('No pudimos cargar las ganancias. Intentá de nuevo.');
        this.loading.set(false);
      },
    });
  }

  async loadCars(): Promise<void> {
    try {
      const cars = await this.carsService.listMyCars();
      this.cars.set(cars);

      // Actualizar gráficos después de cargar autos
      setTimeout(() => {
        this.updateCharts();
      }, 100);
    } catch (error) {
      console.error('Error loading cars:', error);
    }
  }

  async loadExchangeRate(): Promise<void> {
    try {
      const rate = await this.exchangeRateService.getPlatformRate();
      this.exchangeRate.set(rate);
    } catch (error) {
      console.error('Error loading exchange rate:', error);
      this.exchangeRate.set(1000); // Fallback
    }
  }

  private updateCharts(): void {
    const annualDepreciation = this.totalAnnualDepreciation();
    const monthlyDepreciation = annualDepreciation / 12;

    // Calcular depreciación acumulada mes a mes
    const depreciationData: number[] = [];
    for (let i = 1; i <= 12; i++) {
      depreciationData.push(monthlyDepreciation * i);
    }

    // Crear nuevo objeto para forzar actualización del gráfico
    this.depreciationChartData = {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      datasets: [
        {
          label: 'Depreciación Acumulada (ARS)',
          data: depreciationData,
          borderColor: 'rgb(239, 68, 68)', // Red
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };

    // Calcular ingresos acumulados (estimación basada en ganancias mensuales)
    const monthlyIncome =
      this.thisMonthEarnings() ||
      (this.totalAnnualIncome() > 0 ? this.totalAnnualIncome() / 12 : 0);
    const incomeData: number[] = [];
    for (let i = 1; i <= 12; i++) {
      incomeData.push(monthlyIncome * i);
    }

    // Crear nuevo objeto para forzar actualización del gráfico
    this.incomeChartData = {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      datasets: [
        {
          label: 'Ingresos Acumulados (ARS)',
          data: incomeData,
          borderColor: 'rgb(34, 197, 94)', // Green
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }
}
