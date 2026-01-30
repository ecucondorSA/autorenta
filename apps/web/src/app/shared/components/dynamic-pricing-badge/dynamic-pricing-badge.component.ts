import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

/**
 * Badge simple para indicar que un auto usa pricing dinámico
 *
 * Se muestra en:
 * - Resultados de búsqueda
 * - Map booking panel
 * - Car detail cards
 *
 * Features:
 * - Badge visual "Precio Dinámico"
 * - Indicador de surge pricing (si está activo)
 * - Tooltip con explicación
 */
@Component({
  selector: 'app-dynamic-pricing-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="dynamic-pricing-badge" [class.with-surge]="surgeActive">
      <div class="badge-content" [title]="tooltipText">
        <span class="badge-icon">⚡</span>
        <span class="badge-text">{{ badgeText }}</span>
        @if (surgeActive && surgeFactor !== undefined) {
          <span class="surge-indicator">+{{ surgePct }}%</span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .dynamic-pricing-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .badge-content {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        background-color: var(
          --cta-default,
          #667eea
        ); /* Replaced gradient with solid color token */
        color: white;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        cursor: help;
        transition: all 0.2s ease;
      }

      .badge-content:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }

      .badge-icon {
        font-size: 13px;
        animation: pulse 2s ease-in-out infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
        }
      }

      .with-surge .badge-content {
        background-color: var(
          --warning-default,
          #00d95f
        ); /* Replaced gradient with solid color token */
      }

      .surge-indicator {
        background: rgba(255, 255, 255, 0.3);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 700;
      }

      .badge-text {
        white-space: nowrap;
      }
    `,
  ],
})
export class DynamicPricingBadgeComponent {
  @Input() surgeActive = false;
  @Input() surgeFactor?: number;

  get surgePct(): string {
    if (this.surgeFactor === undefined) return '0';
    return Math.round(this.surgeFactor * 100).toString();
  }

  get badgeText(): string {
    return 'Precio Dinámico';
  }

  get tooltipText(): string {
    if (this.surgeActive) {
      return `Precio ajustado según demanda actual (+${this.surgePct}%)`;
    }
    return 'El precio se ajusta automáticamente según demanda, día y hora';
  }
}
