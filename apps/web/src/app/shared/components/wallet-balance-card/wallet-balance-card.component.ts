import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
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
 * - Auto-refresh cada 30 segundos
 * - Alerta visual para depósitos pendientes
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
export class WalletBalanceCardComponent implements OnInit, OnDestroy {
  private readonly walletService = inject(WalletService);
  private refreshInterval?: number;

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

  /**
   * Depósitos pendientes
   */
  readonly pendingDeposits = signal<number>(0);

  /**
   * Indica si hay depósitos pendientes
   */
  readonly hasPendingDeposits = computed(() => this.pendingDeposits() > 0);

  /**
   * Auto-refresh habilitado (puede deshabilitarse en production si se desea)
   */
  readonly autoRefreshEnabled = signal(true);

  /**
   * Intervalo de refresh en milisegundos (30 segundos)
   */
  readonly refreshIntervalMs = 30000;

  // ==================== LIFECYCLE ====================

  async ngOnInit(): Promise<void> {
    // Auto-cargar balance al inicializar
    await this.loadBalance();

    // Cargar pending deposits
    await this.loadPendingDeposits();

    // Iniciar auto-refresh si está habilitado
    if (this.autoRefreshEnabled()) {
      this.startAutoRefresh();
    }
  }

  ngOnDestroy(): void {
    // Limpiar interval al destruir componente
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
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
    await this.loadPendingDeposits();
  }

  /**
   * Carga el número de depósitos pendientes
   */
  async loadPendingDeposits(): Promise<void> {
    try {
      // Obtener transacciones pendientes de tipo deposit
      const transactions = await this.walletService.getTransactions({
        type: 'deposit',
        status: 'pending',
      });

      this.pendingDeposits.set(transactions.length);

      // Log para debugging
      if (transactions.length > 0) {
        console.log(`⚠️  Tienes ${transactions.length} depósito(s) pendiente(s):`, transactions);
      }
    } catch (err) {
      console.error('Error loading pending deposits:', err);
    }
  }

  /**
   * Inicia el auto-refresh del balance
   */
  private startAutoRefresh(): void {
    this.refreshInterval = setInterval(async () => {
      console.log('🔄 Auto-refreshing wallet balance...');
      await this.loadBalance();
      await this.loadPendingDeposits();
    }, this.refreshIntervalMs) as unknown as number;

    console.log(`✅ Auto-refresh habilitado cada ${this.refreshIntervalMs / 1000}s`);
  }

  /**
   * Detiene el auto-refresh
   */
  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
      console.log('⏸️  Auto-refresh deshabilitado');
    }
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
