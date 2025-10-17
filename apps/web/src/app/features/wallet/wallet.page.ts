import { Component, signal, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WalletBalanceCardComponent } from '../../shared/components/wallet-balance-card/wallet-balance-card.component';
import { DepositModalComponent } from '../../shared/components/deposit-modal/deposit-modal.component';
import { TransactionHistoryComponent } from '../../shared/components/transaction-history/transaction-history.component';

/**
 * WalletPage
 *
 * Página principal del wallet del usuario.
 *
 * Integra tres componentes principales:
 * - WalletBalanceCardComponent: Muestra el balance del usuario
 * - DepositModalComponent: Modal para iniciar depósitos
 * - TransactionHistoryComponent: Historial de transacciones
 *
 * Características:
 * - Layout responsivo con grid
 * - Control del modal de depósito
 * - Navegación entre secciones
 * - Info cards con tips de uso
 *
 * Ruta: /wallet
 */
@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [
    CommonModule,
    WalletBalanceCardComponent,
    DepositModalComponent,
    TransactionHistoryComponent,
  ],
  templateUrl: './wallet.page.html',
  styleUrls: ['./wallet.page.css'],
})
export class WalletPage implements AfterViewInit {
  /**
   * Referencia al componente de balance card
   */
  @ViewChild('balanceCard') balanceCard?: WalletBalanceCardComponent;

  /**
   * Controla la visibilidad del modal de depósito
   */
  showDepositModal = signal(false);

  /**
   * Configura el balance card después de que la vista se inicialice
   */
  ngAfterViewInit(): void {
    if (this.balanceCard) {
      this.balanceCard.setDepositClickHandler(() => this.openDepositModal());
    }
  }

  /**
   * Abre el modal de depósito
   */
  openDepositModal(): void {
    this.showDepositModal.set(true);
  }

  /**
   * Cierra el modal de depósito
   */
  closeDepositModal(): void {
    this.showDepositModal.set(false);
  }

  /**
   * Maneja el evento de depósito exitoso
   */
  handleDepositSuccess(paymentUrl: string): void {
    console.log('Depósito iniciado exitosamente. Payment URL:', paymentUrl);
    // El modal ya maneja la redirección automática
    // Aquí podríamos agregar tracking o analytics
  }
}
