import {Component, Input,
  ChangeDetectionStrategy} from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
      bgColor: 'bg-surface-base',
      textColor: 'text-text-primary',
      borderColor: 'border-border-default',
      tooltip: 'No se requiere depósito de garantía para esta reserva',
    },
    locked: {
      icon: '🔒',
      label: 'Garantía bloqueada',
      bgColor: 'bg-warning-bg',
      textColor: 'text-warning-strong',
      borderColor: 'border-warning-border',
      tooltip: 'El depósito está retenido en tu wallet durante el alquiler',
    },
    released: {
      icon: '✅',
      label: 'Garantía liberada',
      bgColor: 'bg-success-bg',
      textColor: 'text-success-strong',
      borderColor: 'border-success-border',
      tooltip: 'El depósito ha sido devuelto a tu wallet',
    },
    charged: {
      icon: '⛔',
      label: 'Garantía cobrada',
      bgColor: 'bg-error-bg',
      textColor: 'text-error-strong',
      borderColor: 'border-error-border',
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
