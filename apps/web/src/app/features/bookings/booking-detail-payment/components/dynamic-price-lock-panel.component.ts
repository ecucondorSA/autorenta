import { Component, Input, Output, EventEmitter, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { PriceLock } from '../../../../core/models/dynamic-pricing.model';

/**
 * Panel que muestra el estado del price lock de dynamic pricing
 *
 * Features:
 * - Countdown timer con actualización cada segundo
 * - Alerta cuando quedan < 2 minutos
 * - Botón para refrescar el lock
 * - Badge de surge pricing (si aplica)
 * - Comparación con precio fijo
 */
@Component({
  selector: 'app-dynamic-price-lock-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="price-lock-panel" [class.expiring-soon]="isExpiringSoon()">
      <!-- Header -->
      <div class="panel-header">
        <div class="header-left">
          <span class="icon">⚡</span>
          <h3 class="title">Precio Dinámico Bloqueado</h3>
        </div>
        <div class="header-right">
          <span class="countdown" [class.warning]="isExpiringSoon()">
            {{ countdownDisplay() }}
          </span>
        </div>
      </div>

      <!-- Price Comparison -->
      @if (comparison) {
        <div class="price-comparison" [class.cheaper]="comparison.isCheaper">
          <div class="comparison-row">
            <span class="label">Precio fijo:</span>
            <span class="value strike">{{ formatPrice(comparison.fixedPrice) }}</span>
          </div>
          <div class="comparison-row highlight">
            <span class="label">Precio dinámico:</span>
            <span class="value">{{ formatPrice(comparison.dynamicPrice) }}</span>
          </div>
          <div class="savings" [class.surcharge]="!comparison.isCheaper">
            {{ comparison.message }}
          </div>
        </div>
      }

      <!-- Surge Badge -->
      @if (surgeInfo && surgeInfo.isActive) {
        <div class="surge-badge" [attr.data-tier]="surgeInfo.tier">
          <span class="surge-icon">{{ surgeInfo.icon }}</span>
          <span class="surge-message">{{ surgeInfo.message }}</span>
        </div>
      }

      <!-- Expiration Warning -->
      @if (isExpiringSoon()) {
        <div class="expiration-warning">
          <span class="warning-icon">⚠️</span>
          <span class="warning-text"
            >El precio se va a actualizar pronto. Completa tu reserva ahora.</span
          >
        </div>
      }

      <!-- Actions -->
      <div class="panel-actions">
        <button type="button" class="btn-refresh" [disabled]="refreshing()" (click)="onRefresh()">
          @if (refreshing()) {
            <span class="spinner"></span>
            <span>Actualizando...</span>
          } @else {
            <span>🔄</span>
            <span>Actualizar precio</span>
          }
        </button>

        @if (priceLock) {
          <button type="button" class="btn-details" (click)="onViewBreakdown()">
            <span>📊</span>
            <span>Ver desglose</span>
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .price-lock-panel {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        padding: 20px;
        color: white;
        margin-bottom: 24px;
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
      }

      .price-lock-panel.expiring-soon {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        animation: pulse 2s ease-in-out infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.02);
        }
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .icon {
        font-size: 24px;
        animation: flash 1.5s ease-in-out infinite;
      }

      @keyframes flash {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      .title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      .countdown {
        font-family: var(--font-mono);
        font-size: 24px;
        font-weight: bold;
        background: rgba(255, 255, 255, 0.2);
        padding: 8px 16px;
        border-radius: 8px;
        backdrop-filter: blur(10px);
      }

      .countdown.warning {
        background: rgba(255, 0, 0, 0.3);
        animation: blink 1s ease-in-out infinite;
      }

      @keyframes blink {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
        }
      }

      .price-comparison {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        backdrop-filter: blur(10px);
      }

      .comparison-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
      }

      .comparison-row.highlight {
        font-size: 18px;
        font-weight: bold;
        border-top: 1px solid rgba(255, 255, 255, 0.3);
        margin-top: 8px;
        padding-top: 12px;
      }

      .label {
        font-size: 14px;
        opacity: 0.9;
      }

      .value {
        font-weight: 600;
      }

      .value.strike {
        text-decoration: line-through;
        opacity: 0.6;
      }

      .savings {
        text-align: center;
        margin-top: 12px;
        padding: 8px;
        background: rgba(34, 197, 94, 0.3);
        border-radius: 6px;
        font-weight: 600;
        font-size: 14px;
      }

      .savings.surcharge {
        background: rgba(239, 68, 68, 0.3);
      }

      .surge-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border-radius: 8px;
        margin-bottom: 12px;
        font-weight: 600;
        font-size: 14px;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
      }

      .surge-badge[data-tier='high'],
      .surge-badge[data-tier='extreme'] {
        background: rgba(239, 68, 68, 0.3);
      }

      .surge-badge[data-tier='medium'] {
        background: rgba(251, 146, 60, 0.3);
      }

      .surge-icon {
        font-size: 18px;
      }

      .expiration-warning {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        margin-bottom: 12px;
        border-left: 4px solid #fbbf24;
      }

      .warning-icon {
        font-size: 20px;
      }

      .warning-text {
        font-size: 14px;
        font-weight: 500;
      }

      .panel-actions {
        display: flex;
        gap: 12px;
        margin-top: 16px;
      }

      .btn-refresh,
      .btn-details {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 16px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        backdrop-filter: blur(10px);
      }

      .btn-refresh {
        background: rgba(255, 255, 255, 0.25);
        color: white;
      }

      .btn-refresh:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.35);
        transform: translateY(-2px);
      }

      .btn-refresh:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .btn-details {
        background: rgba(255, 255, 255, 0.15);
        color: white;
      }

      .btn-details:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: translateY(-2px);
      }

      .spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class DynamicPriceLockPanelComponent {
  @Input() priceLock: PriceLock | null = null;
  @Input() comparison: {
    fixedPrice: number;
    dynamicPrice: number;
    difference: number;
    percentageDiff: number;
    isCheaper: boolean;
    message: string;
  } | null = null;
  @Input() surgeInfo: {
    isActive: boolean;
    tier: string;
    factor: number;
    message: string;
    icon: string;
    badgeColor: string;
  } | null = null;

  @Output() refresh = new EventEmitter<void>();
  @Output() viewBreakdown = new EventEmitter<void>();

  // State
  readonly refreshing = signal(false);
  readonly secondsRemaining = signal(0);

  // Computed
  readonly isExpiringSoon = computed(() => {
    return this.secondsRemaining() > 0 && this.secondsRemaining() < 120;
  });

  readonly countdownDisplay = computed(() => {
    const seconds = this.secondsRemaining();
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start countdown when priceLock changes
    effect(() => {
      const lock = this.priceLock;
      if (lock) {
        this.startCountdown(lock);
      } else {
        this.stopCountdown();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  private startCountdown(priceLock: PriceLock): void {
    this.stopCountdown();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(priceLock.lockedUntil).getTime();
      const diff = expiresAt - now;
      const seconds = Math.max(0, Math.floor(diff / 1000));
      this.secondsRemaining.set(seconds);

      if (seconds === 0) {
        this.stopCountdown();
      }
    };

    updateCountdown();
    this.countdownInterval = setInterval(updateCountdown, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  onRefresh(): void {
    if (this.refreshing()) return;

    this.refreshing.set(true);
    this.refresh.emit();

    // Reset refreshing state after 2 seconds
    setTimeout(() => {
      this.refreshing.set(false);
    }, 2000);
  }

  onViewBreakdown(): void {
    this.viewBreakdown.emit();
  }

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}
