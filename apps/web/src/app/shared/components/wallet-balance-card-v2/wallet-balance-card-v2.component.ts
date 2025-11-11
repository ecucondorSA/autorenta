import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipComponent } from '../tooltip/tooltip.component';
import { WalletService } from '../../../core/services/wallet.service';
import { CardComponent } from '../card/card.component';
import { ButtonComponent } from '../button/button.component';

/**
 * WalletBalanceCardV2Component - Improved wallet balance card with tooltips
 *
 * Enhancements over V1:
 * - Clear visual distinction between available/locked/non-withdrawable
 * - Tooltips explaining each balance type
 * - Better mobile layout
 * - Semantic tokens for colors
 * - WCAG AA compliant
 */
@Component({
  selector: 'app-wallet-balance-card-v2',
  standalone: true,
  imports: [CommonModule, TooltipComponent, CardComponent, ButtonComponent],
  template: `
    <app-card variant="elevated" padding="lg">
      <!-- Main Balance -->
      <div class="balance-main">
        <div class="balance-label-group">
          <span class="balance-label">Balance Total</span>
          <app-tooltip
            text="Suma de todos tus fondos: disponibles + bloqueados + no retirables"
            position="right"
          >
            <svg class="info-icon" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              />
            </svg>
          </app-tooltip>
        </div>
        <div class="balance-amount-main">{{ formatCurrency(totalBalance()) }}</div>
      </div>

      <div class="balance-divider"></div>

      <!-- Balance Breakdown -->
      <div class="balance-breakdown">
        <!-- Available Balance -->
        <div class="balance-item available">
          <div class="balance-item-header">
            <div class="balance-item-indicator available"></div>
            <span class="balance-item-label">Disponible</span>
            <app-tooltip
              text="Dinero que puedes usar para reservas o transferir a otras cuentas"
              position="top"
            >
              <svg class="info-icon-sm" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clip-rule="evenodd"
                />
              </svg>
            </app-tooltip>
          </div>
          <div class="balance-item-amount">{{ formatCurrency(availableBalance()) }}</div>
        </div>

        <!-- Locked Balance -->
        @if (lockedBalance() > 0) {
          <div class="balance-item locked">
            <div class="balance-item-header">
              <div class="balance-item-indicator locked"></div>
              <span class="balance-item-label">Bloqueado</span>
              <app-tooltip
                text="Fondos reservados para garantías o depósitos de seguridad en reservas activas. Se liberarán al finalizar la renta"
                position="top"
              >
                <svg class="info-icon-sm" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clip-rule="evenodd"
                  />
                </svg>
              </app-tooltip>
            </div>
            <div class="balance-item-amount">{{ formatCurrency(lockedBalance()) }}</div>
          </div>
        }

        <!-- Non-Withdrawable Balance -->
        @if (nonWithdrawableBalance() > 0) {
          <div class="balance-item non-withdrawable">
            <div class="balance-item-header">
              <div class="balance-item-indicator non-withdrawable"></div>
              <span class="balance-item-label">No Retirable</span>
              <app-tooltip
                text="Crédito interno de promociones o pagos en efectivo. Solo puede usarse para reservas en AutoRenta, no se puede retirar"
                position="top"
              >
                <svg class="info-icon-sm" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clip-rule="evenodd"
                  />
                </svg>
              </app-tooltip>
            </div>
            <div class="balance-item-amount">{{ formatCurrency(nonWithdrawableBalance()) }}</div>
          </div>
        }
      </div>

      <div class="balance-divider"></div>

      <!-- Withdrawable Amount -->
      <div class="withdrawable-section">
        <div class="withdrawable-label-group">
          <span class="withdrawable-label">Puedes retirar</span>
          <app-tooltip
            text="Monto disponible para transferir a tu cuenta bancaria (excluye fondos bloqueados y no retirables)"
            position="top"
          >
            <svg class="info-icon-sm" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              />
            </svg>
          </app-tooltip>
        </div>
        <div class="withdrawable-amount">{{ formatCurrency(withdrawableBalance()) }}</div>
      </div>

      <!-- Actions -->
      <div footer class="balance-actions">
        <app-button variant="primary" size="md" [fullWidth]="true" (clicked)="depositClick.emit()">
          Depositar
        </app-button>
        <app-button
          variant="secondary"
          size="md"
          [fullWidth]="true"
          [disabled]="withdrawableBalance() === 0"
          (clicked)="withdrawClick.emit()"
        >
          Retirar
        </app-button>
      </div>
    </app-card>
  `,
  styles: [
    `
      .balance-main {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.5rem 0;
      }

      .balance-label-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .balance-label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-secondary);
      }

      .info-icon {
        width: 1.125rem;
        height: 1.125rem;
        color: var(--text-muted);
        cursor: help;
        transition: color var(--duration-fast);
      }

      .info-icon:hover {
        color: var(--cta-default);
      }

      .info-icon-sm {
        width: 1rem;
        height: 1rem;
        color: var(--text-muted);
        cursor: help;
        transition: color var(--duration-fast);
      }

      .info-icon-sm:hover {
        color: var(--cta-default);
      }

      .balance-amount-main {
        font-size: 2rem;
        font-weight: 700;
        color: var(--text-primary);
      }

      .balance-divider {
        height: 1px;
        background: var(--border-default);
        margin: 1rem 0;
      }

      .balance-breakdown {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .balance-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        border-radius: var(--radius-md);
        transition: background var(--duration-fast);
      }

      .balance-item.available {
        background: var(--success-50);
      }

      .balance-item.locked {
        background: var(--warning-50);
      }

      .balance-item.non-withdrawable {
        background: var(--info-50);
      }

      .balance-item-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .balance-item-indicator {
        width: 0.75rem;
        height: 0.75rem;
        border-radius: 50%;
      }

      .balance-item-indicator.available {
        background: var(--success-600);
      }

      .balance-item-indicator.locked {
        background: var(--warning-700);
      }

      .balance-item-indicator.non-withdrawable {
        background: var(--info-600);
      }

      .balance-item-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .balance-item-amount {
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--text-primary);
      }

      .withdrawable-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background: var(--surface-hover);
        border-radius: var(--radius-md);
      }

      .withdrawable-label-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .withdrawable-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-secondary);
      }

      .withdrawable-amount {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--success-700);
      }

      .balance-actions {
        display: flex;
        gap: 0.75rem;
      }

      /* Mobile */
      @media (max-width: 768px) {
        .balance-amount-main {
          font-size: 1.75rem;
        }

        .balance-actions {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class WalletBalanceCardV2Component {
  private readonly walletService = inject(WalletService);

  // ==================== INPUTS/OUTPUTS ====================

  showActions = input<boolean>(true);
  depositClick = output<void>();
  withdrawClick = output<void>();

  // ==================== STATE ====================

  readonly availableBalance = this.walletService.availableBalance;
  readonly lockedBalance = this.walletService.lockedBalance;
  readonly nonWithdrawableBalance = this.walletService.nonWithdrawableBalance;
  readonly withdrawableBalance = this.walletService.withdrawableBalance;
  readonly totalBalance = this.walletService.totalBalance;

  // ==================== METHODS ====================

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100); // Amount is in centavos
  }
}
