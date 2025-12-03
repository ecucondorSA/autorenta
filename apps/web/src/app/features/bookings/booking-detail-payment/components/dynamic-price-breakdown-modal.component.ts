import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { DynamicPriceSnapshot } from '../../../../core/models/dynamic-pricing.model';

/**
 * Modal que muestra el desglose detallado del cálculo de precio dinámico
 *
 * Muestra:
 * - Precio base por hora de la región
 * - Cada factor individual (día, hora, usuario, demanda, eventos)
 * - Multiplicador total
 * - Precio final
 * - Contexto de la reserva (día de la semana, hora, etc.)
 */
@Component({
  selector: 'app-dynamic-price-breakdown-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen) {
      <div class="modal-overlay" (click)="onClose()">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="modal-header">
            <h2 class="modal-title">
              <span class="title-icon">📊</span>
              Desglose de Precio Dinámico
            </h2>
            <button class="btn-close" (click)="onClose()" aria-label="Cerrar">✕</button>
          </div>

          <!-- Content -->
          @if (snapshot) {
            <div class="modal-content">
              <!-- Base Price -->
              <div class="section">
                <h3 class="section-title">Precio Base</h3>
                <div class="price-row base">
                  <span class="label">Precio base por hora</span>
                  <span class="value">{{ formatCurrency(snapshot.breakdown.basePrice) }}</span>
                </div>
              </div>

              <!-- Factors -->
              <div class="section">
                <h3 class="section-title">Factores de Ajuste</h3>

                <!-- Day Factor -->
                <div class="factor-row" [class.positive]="snapshot.breakdown.dayFactor > 0">
                  <div class="factor-header">
                    <span class="factor-label">
                      <span class="factor-icon">📅</span>
                      Día de la semana
                    </span>
                    <span class="factor-value" [class.increase]="snapshot.breakdown.dayFactor > 0">
                      {{ formatFactor(snapshot.breakdown.dayFactor) }}
                    </span>
                  </div>
                  <div class="factor-detail">
                    {{ getDayName(snapshot.details.dayOfWeek) }}
                  </div>
                </div>

                <!-- Hour Factor -->
                <div class="factor-row" [class.positive]="snapshot.breakdown.hourFactor > 0">
                  <div class="factor-header">
                    <span class="factor-label">
                      <span class="factor-icon">🕐</span>
                      Hora del día
                    </span>
                    <span class="factor-value" [class.increase]="snapshot.breakdown.hourFactor > 0">
                      {{ formatFactor(snapshot.breakdown.hourFactor) }}
                    </span>
                  </div>
                  <div class="factor-detail">
                    {{ getHourDescription(snapshot.details.hourOfDay) }}
                  </div>
                </div>

                <!-- User Factor -->
                <div class="factor-row" [class.positive]="snapshot.breakdown.userFactor > 0">
                  <div class="factor-header">
                    <span class="factor-label">
                      <span class="factor-icon">👤</span>
                      Perfil de usuario
                    </span>
                    <span class="factor-value" [class.increase]="snapshot.breakdown.userFactor > 0">
                      {{ formatFactor(snapshot.breakdown.userFactor) }}
                    </span>
                  </div>
                  <div class="factor-detail">
                    {{
                      getUserDescription(
                        snapshot.details.userRentals,
                        snapshot.breakdown.userFactor
                      )
                    }}
                  </div>
                </div>

                <!-- Demand Factor -->
                <div class="factor-row" [class.positive]="snapshot.breakdown.demandFactor > 0">
                  <div class="factor-header">
                    <span class="factor-label">
                      <span class="factor-icon">📈</span>
                      Demanda actual
                    </span>
                    <span
                      class="factor-value"
                      [class.increase]="snapshot.breakdown.demandFactor > 0"
                    >
                      {{ formatFactor(snapshot.breakdown.demandFactor) }}
                    </span>
                  </div>
                  @if (snapshot.surgeActive) {
                    <div class="factor-detail surge">
                      {{ snapshot.surgeMessage }}
                    </div>
                  }
                </div>

                <!-- Event Factor -->
                @if (snapshot.breakdown.eventFactor !== 0) {
                  <div class="factor-row positive">
                    <div class="factor-header">
                      <span class="factor-label">
                        <span class="factor-icon">🎉</span>
                        Eventos especiales
                      </span>
                      <span class="factor-value increase">
                        {{ formatFactor(snapshot.breakdown.eventFactor) }}
                      </span>
                    </div>
                    <div class="factor-detail">Evento activo en la región</div>
                  </div>
                }
              </div>

              <!-- Total Multiplier -->
              <div class="section">
                <div class="multiplier-row">
                  <span class="label">Multiplicador total</span>
                  <span class="value">{{ snapshot.breakdown.totalMultiplier.toFixed(2) }}x</span>
                </div>
              </div>

              <!-- Final Price -->
              <div class="section final-price">
                <div class="price-row">
                  <span class="label">Precio final por hora</span>
                  <span class="value highlight">{{ formatCurrency(snapshot.pricePerHour) }}</span>
                </div>
                <div class="price-row total">
                  <span class="label">Precio total ({{ snapshot.rental_hours }}h)</span>
                  <span class="value highlight">{{ formatCurrency(snapshot.totalPrice) }}</span>
                </div>
              </div>

              <!-- Info Footer -->
              <div class="info-footer">
                <p class="info-text">
                  💡 <strong>Precio bloqueado hasta:</strong>
                  {{ formatLockExpiry(snapshot.locked_until) }}
                </p>
                <p class="info-text small">
                  Este precio está garantizado durante 15 minutos. Si el tiempo expira, se
                  recalculará con los factores actuales.
                </p>
              </div>
            </div>
          }

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn-primary" (click)="onClose()">Entendido</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 20px;
        animation: fadeIn 0.2s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .modal-container {
        background: white;
        border-radius: 16px;
        max-width: 600px;
        width: 100%;
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow:
          0 20px 25px -5px rgba(0, 0, 0, 0.1),
          0 10px 10px -5px rgba(0, 0, 0, 0.04);
        animation: slideUp 0.3s ease;
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px;
        border-bottom: 1px solid var(--border-default, #e5e7eb);
      }

      .modal-title {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        color: var(--text-primary, #111827);
      }

      .title-icon {
        font-size: 28px;
      }

      .btn-close {
        background: none;
        border: none;
        font-size: 24px;
        color: var(--text-secondary, #6b7280);
        cursor: pointer;
        padding: 4px 8px;
        line-height: 1;
        border-radius: 6px;
        transition: all 0.2s;
      }

      .btn-close:hover {
        background: var(--surface-hover-light, #f3f4f6);
        color: var(--text-primary, #111827);
      }

      .modal-content {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
      }

      .section {
        margin-bottom: 24px;
      }

      .section-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary, #374151);
        margin: 0 0 12px 0;
      }

      .price-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--surface-light-subtle, #f9fafb);
        border-radius: 8px;
      }

      .price-row.base {
        background: var(--cta-default, #667eea); /* Replaced gradient with solid color token */
        color: white;
        font-weight: 600;
      }

      .price-row.total {
        background: var(
          --accent-pink-default,
          #f093fb
        ); /* Replaced gradient with solid color token */
        color: white;
        font-weight: 700;
        font-size: 18px;
        margin-top: 8px;
      }

      .label {
        font-size: 14px;
        color: inherit;
      }

      .value {
        font-size: 16px;
        font-weight: 600;
        color: inherit;
      }

      .value.highlight {
        font-size: 20px;
        font-weight: 700;
      }

      .factor-row {
        padding: 16px;
        background: var(--surface-light-subtle, #f9fafb);
        border-radius: 8px;
        margin-bottom: 12px;
        border-left: 4px solid var(--border-default, #d1d5db);
        transition: all 0.2s;
      }

      .factor-row.positive {
        border-left-color: var(--success-default, #10b981);
      }

      .factor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .factor-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: var(--text-primary, #374151);
      }

      .factor-icon {
        font-size: 18px;
      }

      .factor-value {
        font-family: var(--font-mono);
        font-size: 16px;
        font-weight: 700;
        color: var(--text-secondary, #6b7280);
        padding: 4px 12px;
        background: white;
        border-radius: 6px;
      }

      .factor-value.increase {
        color: var(--error-default, #dc2626);
      }

      .factor-detail {
        font-size: 13px;
        color: #6b7280;
        padding-left: 26px;
      }

      .factor-detail.surge {
        color: #dc2626;
        font-weight: 600;
      }

      .multiplier-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        background: #fef3c7;
        border-radius: 8px;
        border: 2px solid #fbbf24;
      }

      .multiplier-row .label {
        font-weight: 600;
        color: #92400e;
      }

      .multiplier-row .value {
        font-family: var(--font-mono);
        font-size: 20px;
        font-weight: 700;
        color: #92400e;
      }

      .final-price {
        background: var(
          --surface-cta-alpha-15,
          rgba(102, 126, 234, 0.15)
        ); /* Replaced gradient with solid color token */
        padding: 16px;
        border-radius: 12px;
        border: 2px solid #667eea;
      }

      .info-footer {
        margin-top: 24px;
        padding: 16px;
        background: #eff6ff;
        border-radius: 8px;
        border-left: 4px solid #3b82f6;
      }

      .info-text {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: #1e40af;
        line-height: 1.5;
      }

      .info-text:last-child {
        margin-bottom: 0;
      }

      .info-text.small {
        font-size: 12px;
        color: #60a5fa;
      }

      .modal-footer {
        padding: 20px 24px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        justify-content: flex-end;
      }

      .btn-primary {
        padding: 12px 24px;
        background: var(--cta-default, #667eea); /* Replaced gradient with solid color token */
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      }

      @media (max-width: 640px) {
        .modal-container {
          max-height: 95vh;
        }

        .modal-header,
        .modal-content,
        .modal-footer {
          padding: 16px;
        }

        .modal-title {
          font-size: 20px;
        }
      }
    `,
  ],
})
export class DynamicPriceBreakdownModalComponent {
  @Input() isOpen = false;
  @Input() snapshot: DynamicPriceSnapshot | null = null;

  @Output() closed = new EventEmitter<void>();

  private readonly currencyFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  private readonly dayNames = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
  ];

  onClose(): void {
    this.closed.emit();
  }

  formatCurrency(amount: number): string {
    return this.currencyFormatter.format(amount);
  }

  formatFactor(factor: number): string {
    const percent = (factor * 100).toFixed(0);
    return factor >= 0 ? `+${percent}%` : `${percent}%`;
  }

  getDayName(dayOfWeek: number): string {
    return this.dayNames[dayOfWeek] || 'Desconocido';
  }

  getHourDescription(hour: number): string {
    if (hour >= 0 && hour < 6) return `${hour}:00 - Madrugada (descuento)`;
    if (hour >= 6 && hour < 10) return `${hour}:00 - Mañana (hora pico)`;
    if (hour >= 10 && hour < 17) return `${hour}:00 - Tarde (normal)`;
    if (hour >= 17 && hour < 22) return `${hour}:00 - Noche (hora pico)`;
    return `${hour}:00 - Noche tardía`;
  }

  getUserDescription(rentals: number, factor: number): string {
    if (rentals === 0) return 'Usuario nuevo (primer reserva)';
    if (rentals >= 10) return `Usuario frecuente (${rentals} reservas completadas)`;
    if (factor < 0) return `Usuario verificado (${rentals} reservas)`;
    return `${rentals} reservas completadas`;
  }

  formatLockExpiry(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
