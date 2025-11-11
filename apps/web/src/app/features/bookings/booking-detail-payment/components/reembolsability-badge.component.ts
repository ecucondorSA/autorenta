import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ReembolsabilityType = 'reembolsable' | 'no-reembolsable' | 'reutilizable';

interface BadgeConfig {
  icon: string;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  tooltip: string;
}

@Component({
  selector: 'app-reembolsability-badge',
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
export class ReembolsabilityBadgeComponent {
  @Input({ required: true }) type!: ReembolsabilityType;
  @Input() customTooltip?: string;

  private readonly badgeConfigs: Record<ReembolsabilityType, BadgeConfig> = {
    reembolsable: {
      icon: '🔄',
      label: 'Reembolsable',
      bgColor: 'bg-success-bg dark:bg-success-900/20',
      textColor: 'text-success-strong dark:text-success-300',
      borderColor: 'border-success-border dark:border-success-700',
      tooltip: 'Se libera automáticamente al devolver el auto sin daños',
    },
    'no-reembolsable': {
      icon: '⚠️',
      label: 'No reembolsable',
      bgColor: 'bg-warning-bg dark:bg-warning-900/20',
      textColor: 'text-warning-strong dark:text-warning-300',
      borderColor: 'border-warning-border dark:border-warning-700',
      tooltip: 'Queda como saldo no retirable en tu wallet',
    },
    reutilizable: {
      icon: '♻️',
      label: 'Reutilizable',
      bgColor: 'bg-cta-default/10 dark:bg-cta-default/20',
      textColor: 'text-cta-default dark:text-cta-default',
      borderColor: 'border-info-200 dark:border-cta-default',
      tooltip: 'Disponible para futuras reservas en AutoRenta',
    },
  };

  get config(): BadgeConfig {
    const baseConfig = this.badgeConfigs[this.type];
    if (this.customTooltip) {
      return { ...baseConfig, tooltip: this.customTooltip };
    }
    return baseConfig;
  }
}
