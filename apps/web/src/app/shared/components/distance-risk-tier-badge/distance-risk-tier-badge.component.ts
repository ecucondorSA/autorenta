import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DistanceRiskTier = 'local' | 'regional' | 'long_distance';

interface TierConfig {
  icon: string;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  tooltip: string;
  guaranteeMultiplier: number;
}

/**
 * DistanceRiskTierBadgeComponent
 *
 * Visual indicator for booking distance risk tiers.
 * - Local (< 50 km): No additional fees, standard guarantee
 * - Regional (50-200 km): Moderate pricing adjustment, +15% guarantee
 * - Long Distance (> 200 km): Higher pricing adjustment, +30% guarantee
 *
 * The badge displays:
 * - Risk tier with color coding
 * - Distinct icon for each tier
 * - Interactive tooltip with pricing impact information
 */
@Component({
  selector: 'app-distance-risk-tier-badge',
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

      <!-- Tooltip with distance and guarantee info -->
      <div
        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-text-inverse text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg"
      >
        {{ config.tooltip }}
        <div class="text-xs mt-1 font-medium text-gray-300">
          Garantía: +{{ (config.guaranteeMultiplier - 1) * 100 | number: '1.0-0' }}%
        </div>
        <!-- Tooltip arrow -->
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
export class DistanceRiskTierBadgeComponent {
  @Input({ required: true }) tier!: DistanceRiskTier;

  private readonly tierConfigs: Record<DistanceRiskTier, TierConfig> = {
    local: {
      icon: '📍',
      label: 'Cercano',
      bgColor: 'bg-success-light/10 dark:bg-success-light/20',
      textColor: 'text-success-light dark:text-success-light',
      borderColor: 'border-success-light/40 dark:border-success-light',
      tooltip: 'Auto disponible en zona cercana (< 50 km)',
      guaranteeMultiplier: 1.0,
    },
    regional: {
      icon: '🚗',
      label: 'Distancia Media',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      textColor: 'text-yellow-700 dark:text-yellow-300',
      borderColor: 'border-yellow-200 dark:border-yellow-700',
      tooltip: 'Auto a distancia media (50-200 km)',
      guaranteeMultiplier: 1.15,
    },
    long_distance: {
      icon: '🛣️',
      label: 'Larga Distancia',
      bgColor: 'bg-warning-light/10 dark:bg-warning-light/20',
      textColor: 'text-warning-light dark:text-warning-light',
      borderColor: 'border-warning-light/40 dark:border-warning-light',
      tooltip: 'Auto disponible a larga distancia (> 200 km)',
      guaranteeMultiplier: 1.3,
    },
  };

  get config(): TierConfig {
    return this.tierConfigs[this.tier];
  }
}
