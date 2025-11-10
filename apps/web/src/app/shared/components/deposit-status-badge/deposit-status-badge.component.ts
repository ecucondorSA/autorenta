import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingDepositStatus } from '../../../core/models';

interface BadgeConfig {
  icon: string;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  tooltip: string;
}

@Component({
  selector: 'app-deposit-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="inline-flex items-center gap-1.5 group relative">
      <span
        [ngClass]="config.bgColor + ' ' + config.textColor + ' ' + config.borderColor"
        class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-200 hover:shadow-md"
      >
        <span class="text-sm mr-1">{{ config.icon }}</span>
        {{ config.label }}
      </span>

      <!-- Tooltip -->
      <div
        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-raised text-text-inverse text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg"
      >
        {{ config.tooltip }}
        <!-- Arrow -->
        <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
          <div class="border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
    `,
  ],
})
export class DepositStatusBadgeComponent {
  @Input({ required: true }) status!: BookingDepositStatus;
  @Input() customTooltip?: string;

  private readonly badgeConfigs: Record<BookingDepositStatus, BadgeConfig> = {
    none: {
      icon: '⚪',
      label: 'Sin garantía',
      bgColor: 'bg-surface-base dark:bg-surface-raised/20',
      textColor: 'text-text-primary dark:text-text-secondary',
      borderColor: 'border-border-default dark:border-border-subtle',
      tooltip: 'No se requiere depósito de garantía para esta reserva',
    },
    locked: {
      icon: '🔒',
      label: 'Garantía bloqueada',
      bgColor: 'bg-warning-50 dark:bg-warning-900/20',
      textColor: 'text-warning-700 dark:text-warning-300',
      borderColor: 'border-warning-200 dark:border-warning-700',
      tooltip: 'El depósito está retenido en tu wallet durante el alquiler',
    },
    released: {
      icon: '✅',
      label: 'Garantía liberada',
      bgColor: 'bg-success-50 dark:bg-success-900/20',
      textColor: 'text-success-700 dark:text-success-300',
      borderColor: 'border-success-200 dark:border-success-700',
      tooltip: 'El depósito ha sido devuelto a tu wallet',
    },
    charged: {
      icon: '⛔',
      label: 'Garantía cobrada',
      bgColor: 'bg-error-50 dark:bg-error-900/20',
      textColor: 'text-error-700 dark:text-error-300',
      borderColor: 'border-error-200 dark:border-error-700',
      tooltip: 'El depósito fue cobrado por daños reportados',
    },
  };

  get config(): BadgeConfig {
    const baseConfig = this.badgeConfigs[this.status];
    if (this.customTooltip) {
      return { ...baseConfig, tooltip: this.customTooltip };
    }
    return baseConfig;
  }
}
