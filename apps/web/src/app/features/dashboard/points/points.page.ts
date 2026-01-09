import { CommonModule, DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { RewardPoolService } from '@core/services/payments/reward-pool.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-points-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MoneyPipe, DecimalPipe, IconComponent],
  templateUrl: './points.page.html',
})
export class PointsPage implements OnInit {
  private readonly rewardPoolService = inject(RewardPoolService);

  readonly loading = this.rewardPoolService.loading;
  readonly error = this.rewardPoolService.error;
  readonly summary = this.rewardPoolService.summary;

  // Computed values from service
  readonly currentMonthPoints = this.rewardPoolService.currentMonthPoints;
  readonly estimatedEarnings = this.rewardPoolService.estimatedEarnings;
  readonly lastMonthEarnings = this.rewardPoolService.lastMonthEarnings;
  readonly totalEarnedAllTime = this.rewardPoolService.totalEarnedAllTime;
  readonly poolStatus = this.rewardPoolService.poolStatus;

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

  // Points breakdown for chart
  readonly pointsBreakdown = computed(() => {
    const summary = this.summary();
    if (!summary) return [];

    const points = summary.currentMonth.points;
    const total = points.total_points || 1; // Avoid division by zero

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
    await this.rewardPoolService.loadOwnerSummary();
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
