import {Component, inject, signal, computed, OnInit,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TelemetryService } from '../../../core/services/telemetry.service';
import type {
  TelemetryHistory,
  TelemetryAverage,
  TelemetryInsights,
} from '../../../core/services/telemetry.service';
import { NotificationManagerService } from '../../../core/services/notification-manager.service';

/**
 * DrivingStatsPage
 *
 * Dashboard de estadísticas de conducción con telemetría GPS.
 *
 * Características:
 * - Score de conducción actual (0-100)
 * - Métricas detalladas: hard brakes, speed violations, night driving, risk zones
 * - Historial de viajes con scores individuales
 * - Comparativa con promedios
 * - Insights y recomendaciones
 * - Tendencia del score (improving, declining, stable)
 *
 * Ruta: /profile/driving-stats
 */
@Component({
  selector: 'app-driving-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './driving-stats.page.html',
  styleUrls: ['./driving-stats.page.css'],
})
export class DrivingStatsPage implements OnInit {
  private readonly router = inject(Router);
  private readonly telemetryService = inject(TelemetryService);
  private readonly toastService = inject(NotificationManagerService);

  readonly loading = signal(true);
  readonly summary = signal<TelemetryAverage | null>(null);
  readonly history = signal<TelemetryHistory[]>([]);
  readonly insights = signal<TelemetryInsights | null>(null);

  // Computed properties
  readonly hasData = computed(() => {
    const avg = this.summary();
    return avg && (avg.total_trips ?? 0) > 0;
  });

  readonly currentScore = computed(
    () => this.summary()?.avg_score ?? this.summary()?.avg_driver_score ?? 0,
  );

  readonly scoreColor = computed(() => {
    const score = this.currentScore();
    if (score >= 90) return 'score-excellent';
    if (score >= 75) return 'score-good';
    if (score >= 60) return 'score-average';
    return 'score-poor';
  });

  readonly scoreLabel = computed(() => {
    const score = this.currentScore();
    if (score >= 90) return 'Excelente';
    if (score >= 75) return 'Bueno';
    if (score >= 60) return 'Regular';
    return 'Necesita Mejorar';
  });

  readonly trendIcon = computed(() => {
    const trend = this.insights()?.score_trend;
    if (trend === 'improving') return '📈';
    if (trend === 'declining') return '📉';
    return '➡️';
  });

  readonly trendLabel = computed(() => {
    const trend = this.insights()?.score_trend;
    if (trend === 'improving') return 'Mejorando';
    if (trend === 'declining') return 'Disminuyendo';
    if (trend === 'stable') return 'Estable';
    return 'Sin datos suficientes';
  });

  readonly trendColor = computed(() => {
    const trend = this.insights()?.score_trend;
    if (trend === 'improving') return 'trend-up';
    if (trend === 'declining') return 'trend-down';
    return 'trend-stable';
  });

  async ngOnInit() {
    await this.loadDrivingData();
  }

  async loadDrivingData() {
    this.loading.set(true);

    try {
      // Load in parallel
      const [avgResult, historyResult, insightsResult] = await Promise.allSettled([
        this.telemetryService.getAverage(3),
        this.telemetryService.getHistory(10),
        this.telemetryService.getInsights(),
      ]);

      if (avgResult.status === 'fulfilled') {
        this.summary.set(avgResult.value);
      }

      if (historyResult.status === 'fulfilled') {
        this.history.set(historyResult.value);
      }

      if (insightsResult.status === 'fulfilled') {
        this.insights.set(insightsResult.value);
      }
    } catch (error) {
      console.error('Error loading driving data:', error);
      this.toastService.error('Error al cargar estadísticas de conducción', '');
    } finally {
      this.loading.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/profile']);
  }

  getScorePercentage(score: number): number {
    return Math.round(score);
  }

  getMetricIcon(metric: string): string {
    const icons: Record<string, string> = {
      hard_brakes: '🛑',
      speed_violations: '⚡',
      night_driving: '🌙',
      risk_zones: '⚠️',
      total_km: '📏',
      total_trips: '🚗',
    };
    return icons[metric] || '📊';
  }

  getMetricLabel(metric: string): string {
    const labels: Record<string, string> = {
      hard_brakes: 'Frenadas Bruscas',
      speed_violations: 'Excesos de Velocidad',
      night_driving: 'Conducción Nocturna',
      risk_zones: 'Zonas de Riesgo',
      total_km: 'Kilómetros Totales',
      total_trips: 'Viajes Totales',
    };
    return labels[metric] || metric;
  }

  formatMetricValue(metric: string, value: number): string {
    if (metric === 'total_km') {
      return `${value.toFixed(1)} km`;
    }
    if (metric === 'night_driving') {
      return `${value.toFixed(1)} h`;
    }
    return value.toString();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  viewTripDetails(bookingId: string) {
    this.router.navigate(['/bookings', bookingId]);
  }

  getTripScoreColor(score: number): string {
    if (score >= 90) return 'score-excellent';
    if (score >= 75) return 'score-good';
    if (score >= 60) return 'score-average';
    return 'score-poor';
  }

  getMainIssueIcon(issue: string): string {
    if (issue.toLowerCase().includes('frenad')) return '🛑';
    if (issue.toLowerCase().includes('velocidad')) return '⚡';
    if (issue.toLowerCase().includes('noctur')) return '🌙';
    if (issue.toLowerCase().includes('zona')) return '⚠️';
    return '📋';
  }
}
