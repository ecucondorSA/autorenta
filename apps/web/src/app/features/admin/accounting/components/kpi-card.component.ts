import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

/**
 * KPI Card Component
 * Muestra una métrica clave con título, valor, cambio porcentual y tendencia
 *
 * Uso:
 * ```html
 * <app-kpi-card
 *   title="Total Activos"
 *   [value]="150000"
 *   [change]="+5.2"
 *   trend="up"
 *   color="success"
 *   icon="cash-outline">
 * </app-kpi-card>
 * ```
 */
@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-card [color]="cardColor" class="kpi-card">
      <ion-card-content class="p-4">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <p class="text-sm opacity-70 mb-1">{{ title }}</p>
            <h2 class="text-2xl font-bold mb-1">{{ formattedValue }}</h2>
            <div *ngIf="change !== undefined" class="flex items-center text-sm">
              <ion-icon
                [name]="
                  trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'
                "
                [class.text-success-light]="trend === 'up'"
                [class.text-error-500]="trend === 'down'"
                [class.text-text-secondary]="trend === 'neutral'"
                class="mr-1"
              ></ion-icon>
              <span
                [class.text-success-light]="trend === 'up'"
                [class.text-error-500]="trend === 'down'"
                [class.text-text-secondary]="trend === 'neutral'"
              >
                {{ change }}%
              </span>
              <span class="ml-1 opacity-60" *ngIf="changeLabel">{{ changeLabel }}</span>
            </div>
          </div>
          <div *ngIf="icon" class="ml-4">
            <ion-icon [name]="icon" class="text-4xl opacity-30"></ion-icon>
          </div>
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: [
    `
      .kpi-card {
        margin: 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .kpi-card ion-card-content {
        padding: 16px;
      }
    `,
  ],
})
export class KpiCardComponent {
  @Input() title = '';
  @Input() value: number | string = 0;
  @Input() change?: number;
  @Input() changeLabel?: string = 'vs mes anterior';
  @Input() trend: 'up' | 'down' | 'neutral' = 'neutral';
  @Input() color: 'primary' | 'success' | 'warning' | 'danger' | 'tertiary' = 'primary';
  @Input() icon?: string;
  @Input() format: 'currency' | 'number' | 'percent' = 'currency';
  @Input() currency: string = 'ARS';

  get cardColor(): string {
    // Devuelve undefined para usar color por defecto
    return this.color === 'primary' ? '' : this.color;
  }

  get formattedValue(): string {
    if (typeof this.value === 'string') {
      return this.value;
    }

    switch (this.format) {
      case 'currency':
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: this.currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(this.value);

      case 'percent':
        return `${this.value.toFixed(1)}%`;

      case 'number':
      default:
        return new Intl.NumberFormat('es-AR').format(this.value);
    }
  }
}
