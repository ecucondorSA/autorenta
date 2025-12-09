import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * BookingFlowMetricsComponent
 *
 * Componente que muestra métricas del flujo de booking:
 * - Tasa de conversión por estado
 * - Tiempo promedio en cada estado
 * - Distribución de bookings
 */
@Component({
  selector: 'app-booking-flow-metrics',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div
      class="rounded-2xl border border-border-default dark:border-border-muted bg-surface-raised dark:bg-surface-secondary p-6 shadow-lg"
    >
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-lg font-semibold text-text-primary dark:text-text-primary">
            📊 Métricas de Flujo
          </h3>
          <p class="text-xs text-text-secondary dark:text-text-secondary/70 mt-1">
            Análisis del ciclo de vida de tus reservas
          </p>
        </div>
        <a
          [routerLink]="['/bookings/owner']"
          class="text-xs font-medium text-cta-default hover:text-cta-default/80 transition-colors"
        >
          Ver todas →
        </a>
      </div>

      <!-- Metrics Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- Pending -->
        <div
          class="rounded-lg bg-warning-bg/50 dark:bg-warning-900/20 p-4 border border-warning-border/30"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-warning-text dark:text-warning-400"
              >Pendientes</span
            >
            <span class="text-lg">⏳</span>
          </div>
          <p class="h4 text-text-primary dark:text-text-primary">
            {{ pendingCount() }}
          </p>
          <p class="text-xs text-text-secondary dark:text-text-secondary/70 mt-1">
            {{ pendingPercentage() }}% del total
          </p>
        </div>

        <!-- Confirmed -->
        <div
          class="rounded-lg bg-success-light/20 dark:bg-success-light/30 p-4 border border-success-border/30"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-success-strong dark:text-success-strong"
              >Confirmadas</span
            >
            <span class="text-lg">✅</span>
          </div>
          <p class="h4 text-text-primary dark:text-text-primary">
            {{ confirmedCount() }}
          </p>
          <p class="text-xs text-text-secondary dark:text-text-secondary/70 mt-1">
            {{ confirmedPercentage() }}% del total
          </p>
        </div>

        <!-- In Progress -->
        <div
          class="rounded-lg bg-cta-default/20 dark:bg-cta-default/30 p-4 border border-cta-default/30"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-cta-default dark:text-cta-default">En Curso</span>
            <span class="text-lg">🚗</span>
          </div>
          <p class="h4 text-text-primary dark:text-text-primary">
            {{ inProgressCount() }}
          </p>
          <p class="text-xs text-text-secondary dark:text-text-secondary/70 mt-1">
            {{ inProgressPercentage() }}% del total
          </p>
        </div>

        <!-- Completed -->
        <div
          class="rounded-lg bg-primary-100/50 dark:bg-primary-900/20 p-4 border border-primary-300/30"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-primary-700 dark:text-primary-300"
              >Completadas</span
            >
            <span class="text-lg">🎉</span>
          </div>
          <p class="h4 text-text-primary dark:text-text-primary">
            {{ completedCount() }}
          </p>
          <p class="text-xs text-text-secondary dark:text-text-secondary/70 mt-1">
            {{ completedPercentage() }}% del total
          </p>
        </div>
      </div>

      <!-- Conversion Rate -->
      <div class="mt-6 pt-6 border-t border-border-default dark:border-border-muted">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-text-secondary dark:text-text-secondary/70">
              Tasa de Conversión
            </p>
            <p class="text-xs text-text-secondary dark:text-text-secondary/60 mt-1">
              De pendientes a completadas
            </p>
          </div>
          <div class="text-right">
            <p class="h3 text-text-primary dark:text-text-primary">{{ conversionRate() }}%</p>
            <p class="text-xs text-text-secondary dark:text-text-secondary/70 mt-1">
              {{ completedCount() }} / {{ totalCount() }}
            </p>
          </div>
        </div>
        <!-- Progress Bar -->
        <div
          class="mt-4 h-2 w-full rounded-full bg-surface-base dark:bg-surface-raised overflow-hidden"
        >
          <div
            class="h-full bg-gradient-to-r from-success-light to-cta-default transition-all duration-500"
            [style.width.%]="conversionRate()"
          ></div>
        </div>
      </div>
    </div>
  `,
})
export class BookingFlowMetricsComponent {
  private _pendingCount = signal<number>(0);
  private _confirmedCount = signal<number>(0);
  private _inProgressCount = signal<number>(0);
  private _completedCount = signal<number>(0);

  // Expose signals as readonly for template
  readonly pendingCount = this._pendingCount.asReadonly();
  readonly confirmedCount = this._confirmedCount.asReadonly();
  readonly inProgressCount = this._inProgressCount.asReadonly();
  readonly completedCount = this._completedCount.asReadonly();

  @Input() set pendingCountInput(value: number) {
    this._pendingCount.set(value);
  }

  @Input() set confirmedCountInput(value: number) {
    this._confirmedCount.set(value);
  }

  @Input() set inProgressCountInput(value: number) {
    this._inProgressCount.set(value);
  }

  @Input() set completedCountInput(value: number) {
    this._completedCount.set(value);
  }

  readonly totalCount = computed(
    () =>
      this._pendingCount() +
      this._confirmedCount() +
      this._inProgressCount() +
      this._completedCount(),
  );

  readonly pendingPercentage = computed(() => {
    const total = this.totalCount();
    return total > 0 ? Math.round((this._pendingCount() / total) * 100) : 0;
  });

  readonly confirmedPercentage = computed(() => {
    const total = this.totalCount();
    return total > 0 ? Math.round((this._confirmedCount() / total) * 100) : 0;
  });

  readonly inProgressPercentage = computed(() => {
    const total = this.totalCount();
    return total > 0 ? Math.round((this._inProgressCount() / total) * 100) : 0;
  });

  readonly completedPercentage = computed(() => {
    const total = this.totalCount();
    return total > 0 ? Math.round((this._completedCount() / total) * 100) : 0;
  });

  readonly conversionRate = computed(() => {
    const total = this.totalCount();
    const completed = this._completedCount();
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  });
}
