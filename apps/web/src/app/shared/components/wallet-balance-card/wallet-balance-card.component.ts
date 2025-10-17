import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WalletService } from '../../../core/services/wallet.service';

/**
 * WalletBalanceCardComponent
 *
 * Componente visual para mostrar el balance del wallet del usuario.
 *
 * Características:
 * - Muestra balance disponible, bloqueado y total
 * - Indicador de carga mientras se obtiene el balance
 * - Manejo de errores con mensajes amigables
 * - Botón para iniciar depósito
 * - Auto-refresh al inicializar
 *
 * Uso:
 * ```html
 * <app-wallet-balance-card
 *   [showDepositButton]="true"
 *   (depositClick)="handleDepositClick()">
 * </app-wallet-balance-card>
 * ```
 */
@Component({
  selector: 'app-wallet-balance-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wallet-balance-card.component.html',
  styleUrls: ['./wallet-balance-card.component.css'],
})
export class WalletBalanceCardComponent implements OnInit {
  private readonly walletService = inject(WalletService);

  // ==================== INPUTS & OUTPUTS ====================

  /**
   * Mostrar botón de depósito
   */
  showDepositButton = signal(true);

  /**
   * Callback para cuando el usuario hace click en "Depositar"
   */
  depositClickHandler?: () => void;

  /**
   * Permite configurar si mostrar el botón de depósito desde el componente padre
   */
  setShowDepositButton(show: boolean): void {
    this.showDepositButton.set(show);
  }

  /**
   * Permite configurar el handler de depósito desde el componente padre
   */
  setDepositClickHandler(handler: () => void): void {
    this.depositClickHandler = handler;
  }

  // ==================== PUBLIC SIGNALS ====================

  /**
   * Balance actual del wallet
   */
  readonly balance = this.walletService.balance;

  /**
   * Balance disponible (computed del servicio)
   */
  readonly availableBalance = this.walletService.availableBalance;

  /**
   * Balance bloqueado (computed del servicio)
   */
  readonly lockedBalance = this.walletService.lockedBalance;

  /**
   * Balance total (computed del servicio)
   */
  readonly totalBalance = this.walletService.totalBalance;

  /**
   * Estado de carga del balance
   */
  readonly isLoadingBalance = signal(false);

  /**
   * Error actual si existe
   */
  readonly error = this.walletService.error;

  // ==================== LIFECYCLE ====================

  async ngOnInit(): Promise<void> {
    // Auto-cargar balance al inicializar
    await this.loadBalance();
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Carga el balance del usuario
   */
  async loadBalance(): Promise<void> {
    this.isLoadingBalance.set(true);
    try {
      await this.walletService.getBalance();
    } catch (err) {
      // El error ya está en walletService.error()
      console.error('Error loading wallet balance:', err);
    } finally {
      this.isLoadingBalance.set(false);
    }
  }

  /**
   * Maneja el click en el botón "Depositar"
   */
  onDepositClick(): void {
    if (this.depositClickHandler) {
      this.depositClickHandler();
    }
  }

  /**
   * Reintenta cargar el balance después de un error
   */
  async retry(): Promise<void> {
    await this.loadBalance();
  }

  /**
   * Formatea un número como moneda USD
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}
