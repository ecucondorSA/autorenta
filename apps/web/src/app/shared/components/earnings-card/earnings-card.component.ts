import { CommonModule } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';

/**
 * EarningsCardComponent
 *
 * Componente visual mejorado para mostrar ganancias en tiempo real
 * con animaciones, gráficos y comparaciones.
 */
@Component({
  selector: 'app-earnings-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './earnings-card.component.html',
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class EarningsCardComponent {
  private _thisMonthEarnings = signal<number>(0);
  private _lastMonthEarnings = signal<number>(0);
  private _totalEarnings = signal<number>(0);
  private _monthlyGoal = signal<number | null>(null);

  // Expose signals as readonly for template
  readonly thisMonthEarnings = this._thisMonthEarnings.asReadonly();
  readonly lastMonthEarnings = this._lastMonthEarnings.asReadonly();
  readonly totalEarnings = this._totalEarnings.asReadonly();
  readonly monthlyGoal = this._monthlyGoal.asReadonly();

  @Input() set thisMonthEarningsInput(value: number) {
    this._thisMonthEarnings.set(value);
  }

  @Input() set lastMonthEarningsInput(value: number) {
    this._lastMonthEarnings.set(value);
  }

  @Input() set totalEarningsInput(value: number) {
    this._totalEarnings.set(value);
  }

  @Input() set monthlyGoalInput(value: number | null) {
    this._monthlyGoal.set(value);
  }

  readonly growthPercentage = computed(() => {
    const current = this._thisMonthEarnings();
    const previous = this._lastMonthEarnings();
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  });

  readonly monthProgress = computed(() => {
    const goal = this._monthlyGoal();
    if (!goal || goal === 0) {
      // Si no hay meta, calcular progreso basado en días del mes
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const currentDay = now.getDate();
      return Math.round((currentDay / daysInMonth) * 100);
    }
    const progress = (this._thisMonthEarnings() / goal) * 100;
    return Math.min(Math.round(progress), 100); // Cap at 100%
  });
}
