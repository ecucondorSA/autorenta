import { CommonModule, DecimalPipe, PercentPipe } from '@angular/common';
import { Component, computed, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  VA_THRESHOLDS,
  MAX_CARS_PER_OWNER,
  MAX_POOL_SHARE_PER_OWNER,
} from '@core/models/reward-pool.model';
import { RewardPoolService } from '@core/services/payments/reward-pool.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-points-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MoneyPipe, DecimalPipe, PercentPipe],
  templateUrl: './points.page.html',
})
export class PointsPage implements OnInit {
  private readonly rewardPoolService = inject(RewardPoolService);

  readonly loading = this.rewardPoolService.loading;
  readonly error = this.rewardPoolService.error;
  readonly summary = this.rewardPoolService.summary;

  // Senior model signals
  readonly seniorSummary = this.rewardPoolService.seniorSummary;
  readonly carDailyPoints = this.rewardPoolService.carDailyPoints;
  readonly poolConfig = this.rewardPoolService.poolConfig;

  // Toggle between legacy and senior view
  readonly useSeniorModel = signal(true);

  // Constants for template
  readonly VA_THRESHOLDS = VA_THRESHOLDS;
  readonly MAX_CARS = MAX_CARS_PER_OWNER;
  readonly MAX_SHARE = MAX_POOL_SHARE_PER_OWNER;

  // Computed values from service (legacy)
  readonly currentMonthPoints = this.rewardPoolService.currentMonthPoints;
  readonly estimatedEarnings = this.rewardPoolService.estimatedEarnings;
  readonly lastMonthEarnings = this.rewardPoolService.lastMonthEarnings;
  readonly totalEarnedAllTime = this.rewardPoolService.totalEarnedAllTime;
  readonly poolStatus = this.rewardPoolService.poolStatus;

  // Senior model computed
  readonly totalPointsSenior = this.rewardPoolService.totalPointsSenior;
  readonly estimatedPayoutUsd = this.rewardPoolService.estimatedPayoutUsd;
  readonly eligibleCars = this.rewardPoolService.eligibleCars;
  readonly isEligible = this.rewardPoolService.isEligible;

  // Local computed
  readonly currentMonthName = computed(() => {
    const summary = this.summary();
    if (!summary) return '';
    return this.rewardPoolService.getMonthName(summary.currentMonth.month);
  });

  readonly lastMonthName = computed(() => {
    const summary = this.summary();
    if (!summary?.lastMonth) return '';
    return this.rewardPoolService.getMonthName(summary.lastMonth.month);
  });

  readonly poolTotalFormatted = computed(() => {
    const pool = this.poolStatus();
    if (!pool) return 0;
    return pool.total_available_cents / 100;
  });

  readonly pointsGrowth = computed(() => {
    const summary = this.summary();
    if (!summary?.lastMonth) return 0;
    const current = summary.currentMonth.points.total_points;
    const last = summary.lastMonth.points.total_points;
    if (last === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - last) / last) * 100);
  });

  readonly isGrowthPositive = computed(() => this.pointsGrowth() >= 0);

  // Senior model: Car breakdown with factors
  readonly carFactorsBreakdown = computed(() => {
    const summary = this.seniorSummary();
    if (!summary) return [];

    return summary.carPoints.map(car => ({
      carId: car.carId,
      carTitle: car.carTitle,
      points: car.points,
      eligibleDays: car.eligibleDays,
      avgDailyPoints: car.avgDailyPoints,
      valueFactor: car.factors.valueFactor,
      valueFactorLabel: this.rewardPoolService.getFactorQualityLabel(car.factors.valueFactor, 'value'),
      valueFactorColor: this.rewardPoolService.getFactorColor(car.factors.valueFactor, 'value'),
      repFactor: car.factors.repFactor,
      repFactorLabel: this.rewardPoolService.getFactorQualityLabel(car.factors.repFactor, 'rep'),
      repFactorColor: this.rewardPoolService.getFactorColor(car.factors.repFactor, 'rep'),
      demandFactor: car.factors.demandFactor,
      demandFactorLabel: this.rewardPoolService.getFactorQualityLabel(car.factors.demandFactor, 'demand'),
      demandFactorColor: this.rewardPoolService.getFactorColor(car.factors.demandFactor, 'demand'),
      isTopCar: summary.carPoints.indexOf(car) < MAX_CARS_PER_OWNER,
    }));
  });

  // VA issues summary
  readonly vaIssues = computed(() => {
    const dailyPoints = this.carDailyPoints();
    const issues = new Map<string, number>();

    for (const dp of dailyPoints) {
      if (!dp.vaStatus && dp.vaFailureReasons) {
        for (const reason of dp.vaFailureReasons) {
          issues.set(reason, (issues.get(reason) || 0) + 1);
        }
      }
    }

    return Array.from(issues.entries())
      .map(([reason, count]) => ({
        reason,
        label: this.rewardPoolService.getVAFailureLabel(reason),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  });

  // Legacy: Points breakdown for chart
  readonly pointsBreakdown = computed(() => {
    const summary = this.summary();
    if (!summary) return [];

    const points = summary.currentMonth.points;
    const total = points.total_points || 1;

    return [
      {
        label: 'Disponibilidad',
        value: points.availability_points,
        percentage: (points.availability_points / total) * 100,
        color: 'bg-success-strong',
        icon: 'calendar',
      },
      {
        label: 'Calificación',
        value: points.rating_points,
        percentage: (points.rating_points / total) * 100,
        color: 'bg-warning-strong',
        icon: 'star',
      },
      {
        label: 'Antigüedad',
        value: points.seniority_points,
        percentage: (points.seniority_points / total) * 100,
        color: 'bg-primary-600',
        icon: 'clock',
      },
      {
        label: 'Referidos',
        value: points.referral_points,
        percentage: (points.referral_points / total) * 100,
        color: 'bg-purple-500',
        icon: 'users',
      },
      {
        label: 'Tiempo de Respuesta',
        value: points.response_time_points,
        percentage: (points.response_time_points / total) * 100,
        color: 'bg-cyan-500',
        icon: 'zap',
      },
      {
        label: 'Participación',
        value: points.participation_points,
        percentage: (points.participation_points / total) * 100,
        color: 'bg-pink-500',
        icon: 'activity',
      },
    ].filter((p) => p.value > 0);
  });

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    // Only load senior model - legacy tables (community_rewards, reward_pool) don't exist
    await this.rewardPoolService.loadSeniorSummary();
  }

  toggleModel(): void {
    this.useSeniorModel.update(v => !v);
  }

  getMonthName(month: number): string {
    return this.rewardPoolService.getMonthName(month);
  }

  getStatusLabel(status: string): string {
    return this.rewardPoolService.getStatusLabel(status);
  }

  getStatusColor(status: string): string {
    return this.rewardPoolService.getStatusColor(status);
  }

  formatCents(cents: number | null | undefined): number {
    return (cents || 0) / 100;
  }
}
