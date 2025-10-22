import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
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
  imports: [CommonModule, TranslateModule],
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
   * Fondos retirables (después de aplicar el piso no reembolsable)
   */
  readonly withdrawableBalance = this.walletService.withdrawableBalance;

  /**
   * Crédito interno no reembolsable
   */
  readonly nonWithdrawableBalance = this.walletService.nonWithdrawableBalance;

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

  /**
   * Timestamp de última actualización del balance
   */
  readonly lastUpdate = signal<Date | null>(null);

  /**
   * Mostrar información bancaria
   */
  readonly showBankInfo = signal(false);

  /**
   * Datos bancarios para transferencias manuales
   */
  readonly bankDetails = {
    accountName: 'AutoRentA SRL',
    bank: 'Banco Galicia',
    alias: 'AUTORENTAR.PAGOS',
    cbu: '0170018740000000123456',
    email: 'pagos@autorentar.com',
  };

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
      this.lastUpdate.set(new Date()); // Guardar timestamp de actualización
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
   * También fuerza el polling de pagos pendientes en MercadoPago
   */
  async retry(): Promise<void> {
    this.isLoadingBalance.set(true);

    try {
      console.log('🔄 Usuario solicitó actualización manual...');

      // 1. Forzar polling de MercadoPago (esto también refresca el balance internamente)
      const pollResult = await this.walletService.forcePollPendingPayments();
      console.log('✅ Resultado del polling:', pollResult);

      // 2. Refrescar balance (por si el polling confirmó algún depósito)
      await this.loadBalance();

      // 3. Refrescar pending deposits
      await this.loadPendingDeposits();

      // 4. Mostrar mensaje al usuario si se confirmó algún depósito
      if (pollResult.confirmed > 0) {
        alert(`✅ ${pollResult.message}\n\nTu balance se ha actualizado.`);
      } else if (this.pendingDeposits() > 0) {
        alert('⏳ Tus depósitos aún están pendientes de aprobación en MercadoPago.\n\nPueden tardar algunos minutos. Te notificaremos cuando se acrediten.');
      }
    } catch (err) {
      console.error('Error al actualizar:', err);
      // El error ya está en walletService.error(), solo recargamos el balance local
      await this.loadBalance();
      await this.loadPendingDeposits();
    } finally {
      this.isLoadingBalance.set(false);
    }
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
   * Formatea un número (en centavos) como moneda
   * Usa la moneda del balance actual o USD por defecto
   */
  formatCurrency(amountCents: number): string {
    const currency = this.balance()?.currency || 'USD';
    const amount = amountCents / 100; // Convertir centavos a unidades

    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      currencyDisplay: 'symbol', // Usa solo el símbolo (US$) sin label adicional
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Obtiene texto de última actualización en formato relativo
   */
  getLastUpdateText(): string {
    const last = this.lastUpdate();
    if (!last) return 'Nunca';

    const diff = Date.now() - last.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 10) return 'Ahora mismo';
    if (seconds < 60) return `hace ${seconds}s`;
    if (seconds < 3600) return `hace ${Math.floor(seconds / 60)}m`;

    return last.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Copia texto al portapapeles
   */
  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      console.log(`✅ Copiado: ${text}`);
      // TODO: Agregar toast notification en vez de alert
      alert(`✅ Copiado al portapapeles: ${text}`);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
      alert('❌ Error al copiar. Por favor, copia manualmente.');
    }
  }
}
