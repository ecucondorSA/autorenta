
import { ChangeDetectionStrategy, Component, computed, Input, signal } from '@angular/core';
import type { UrgencyIndicator } from '../../../../core/models/marketplace.model';

/**
 * UrgencyBannerComponent - Real-time availability indicator
 *
 * Features:
 * - Animated pulse effect
 * - Multiple urgency types
 * - Countdown timer (optional)
 * - Dismissible
 */
@Component({
  selector: 'app-urgency-banner',
  standalone: true,
  imports: [],
  template: `
    @if (!dismissed() && indicator) {
      <div class="urgency-banner" [class]="urgencyClass()">
        <div class="banner-content">
          <span class="pulse-dot"></span>
          <span class="banner-icon">{{ urgencyIcon() }}</span>
          <span class="banner-message">{{ message() }}</span>
          @if (showTimer && indicator.expiresAt) {
            <span class="banner-timer">{{ formatTimeRemaining() }}</span>
          }
        </div>
        @if (dismissible) {
          <button type="button" class="dismiss-btn" aria-label="Cerrar" (click)="dismiss()">
            ×
          </button>
        }
      </div>
    }
  `,
  styles: [
    `
      .urgency-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-lg);
        font-size: var(--text-sm);
        font-weight: 500;
        animation: slideIn 0.3s ease;

        /* Default: High demand */
        background: var(--warning-default); /* Reemplazado gradiente con color sólido */
        color: var(--warning-800);
        border: 1px solid var(--warning-200);

        :host-context(.dark) & {
          background: var(--surface-warning-dark); /* Reemplazado gradiente con color sólido */
          color: var(--warning-100);
          border-color: var(--warning-700);
        }
      }

      /* Variants */
      .urgency-banner.low-stock {
        background: var(--surface-error-light); /* Reemplazado gradiente con color sólido */
        color: var(--error-800);
        border-color: var(--error-200);

        :host-context(.dark) & {
          background: var(--surface-error-dark); /* Reemplazado gradiente con color sólido */
          color: var(--error-100);
          border-color: var(--error-700);
        }
      }

      .urgency-banner.limited-time {
        background: var(--surface-brand-light); /* Reemplazado gradiente con color sólido */
        color: var(--primary-800);
        border-color: var(--primary-200);

        :host-context(.dark) & {
          background: var(--surface-brand-dark); /* Reemplazado gradiente con color sólido */
          color: var(--primary-100);
          border-color: var(--primary-700);
        }
      }

      .urgency-banner.popular {
        background: var(--surface-success-light); /* Reemplazado gradiente con color sólido */
        color: var(--success-800);
        border-color: var(--success-200);

        :host-context(.dark) & {
          background: var(--surface-success-dark); /* Reemplazado gradiente con color sólido */
          color: var(--success-100);
          border-color: var(--success-700);
        }
      }

      .banner-content {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex: 1;
        min-width: 0;
      }

      .pulse-dot {
        flex-shrink: 0;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
        animation: pulse 1.5s ease-in-out infinite;
      }

      .banner-icon {
        flex-shrink: 0;
        font-size: var(--text-base);
      }

      .banner-message {
        flex: 1;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .banner-timer {
        flex-shrink: 0;
        padding: var(--space-1) var(--space-2);
        background: var(--shadow-dark-alpha-10, rgba(0, 0, 0, 0.1));
        border-radius: var(--radius-sm);
        font-variant-numeric: tabular-nums;
        font-weight: 600;

        :host-context(.dark) & {
          background: var(--border-light-alpha-10, rgba(255, 255, 255, 0.1));
        }
      }

      .dismiss-btn {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: var(--radius-full);
        border: none;
        background: transparent;
        color: inherit;
        opacity: 0.7;
        cursor: pointer;
        font-size: var(--text-lg);
        transition: opacity 0.2s ease;

        &:hover {
          opacity: 1;
        }
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.5;
          transform: scale(0.8);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UrgencyBannerComponent {
  @Input() indicator: UrgencyIndicator | null = null;
  @Input() dismissible = true;
  @Input() showTimer = false;

  readonly dismissed = signal(false);

  readonly urgencyClass = computed(() => {
    if (!this.indicator) return '';
    return this.indicator.type.replace('_', '-');
  });

  readonly urgencyIcon = computed(() => {
    if (!this.indicator) return '';
    switch (this.indicator.type) {
      case 'low_stock':
        return '🔥';
      case 'high_demand':
        return '📈';
      case 'limited_time':
        return '⏰';
      case 'popular':
        return '⭐';
      default:
        return '📢';
    }
  });

  readonly message = computed(() => {
    if (!this.indicator) return '';
    switch (this.indicator.type) {
      case 'low_stock':
        return `¡Solo quedan ${this.indicator.count} disponibles!`;
      case 'high_demand':
        return 'Alta demanda en esta zona';
      case 'limited_time':
        return 'Oferta por tiempo limitado';
      case 'popular':
        return `${this.indicator.count} personas viendo ahora`;
      default:
        return this.indicator.message;
    }
  });

  dismiss(): void {
    this.dismissed.set(true);
  }

  formatTimeRemaining(): string {
    if (!this.indicator?.expiresAt) return '';

    const now = new Date();
    const expires = new Date(this.indicator.expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expirado';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}
