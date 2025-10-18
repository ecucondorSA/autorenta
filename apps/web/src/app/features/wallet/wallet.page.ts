import { Component, signal, ViewChild, AfterViewInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WalletBalanceCardComponent } from '../../shared/components/wallet-balance-card/wallet-balance-card.component';
import { DepositModalComponent } from '../../shared/components/deposit-modal/deposit-modal.component';
import { TransactionHistoryComponent } from '../../shared/components/transaction-history/transaction-history.component';
import { BankAccountFormComponent } from '../../shared/components/bank-account-form/bank-account-form.component';
import { BankAccountsListComponent } from '../../shared/components/bank-accounts-list/bank-accounts-list.component';
import { WithdrawalRequestFormComponent } from '../../shared/components/withdrawal-request-form/withdrawal-request-form.component';
import { WithdrawalHistoryComponent } from '../../shared/components/withdrawal-history/withdrawal-history.component';
import { WithdrawalService } from '../../core/services/withdrawal.service';
import type { AddBankAccountParams, RequestWithdrawalParams } from '../../core/models/wallet.model';

/**
 * WalletPage
 *
 * Página principal del wallet del usuario.
 *
 * Integra componentes para:
 * - Balance y depósitos
 * - Cuentas bancarias
 * - Solicitudes de retiro
 * - Historial de transacciones
 *
 * Características:
 * - Layout responsivo con tabs
 * - Control del modal de depósito
 * - Gestión completa de retiros
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
    BankAccountFormComponent,
    BankAccountsListComponent,
    WithdrawalRequestFormComponent,
    WithdrawalHistoryComponent,
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
   * Tab activa (transactions | withdrawals)
   */
  activeTab = signal<'transactions' | 'withdrawals'>('transactions');

  /**
   * Modo de retiro (form | accounts)
   */
  withdrawalMode = signal<'form' | 'accounts'>('form');

  /**
   * Estado de carga
   */
  loading = computed(() => this.withdrawalService.loading());

  constructor(private withdrawalService: WithdrawalService) {
    // Cargar cuentas bancarias y retiros al iniciar
    this.loadWithdrawalData();
  }

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

  /**
   * Cambia el tab activo
   */
  setActiveTab(tab: 'transactions' | 'withdrawals'): void {
    this.activeTab.set(tab);
  }

  /**
   * Cambia el modo de retiro
   */
  setWithdrawalMode(mode: 'form' | 'accounts'): void {
    this.withdrawalMode.set(mode);
  }

  /**
   * Carga los datos de retiro (cuentas bancarias y solicitudes)
   */
  private async loadWithdrawalData(): Promise<void> {
    try {
      await Promise.all([
        this.withdrawalService.getBankAccounts(),
        this.withdrawalService.getWithdrawalRequests(),
      ]);
    } catch (error) {
      console.error('Error loading withdrawal data:', error);
    }
  }

  /**
   * Maneja la creación de una cuenta bancaria
   */
  async handleAddBankAccount(params: AddBankAccountParams): Promise<void> {
    try {
      await this.withdrawalService.addBankAccount(params);
      alert('Cuenta bancaria agregada exitosamente');
      this.setWithdrawalMode('form');
    } catch (error: any) {
      alert('Error al agregar cuenta bancaria: ' + (error.message || 'Error desconocido'));
    }
  }

  /**
   * Maneja la solicitud de retiro
   */
  async handleWithdrawalRequest(params: RequestWithdrawalParams): Promise<void> {
    try {
      const result = await this.withdrawalService.requestWithdrawal(params);
      if (result.success) {
        alert(`Retiro solicitado exitosamente!\n\nMonto: $${params.amount}\nComisión: $${result.fee_amount}\nNeto: $${result.net_amount}`);
        // Recargar historial
        await this.withdrawalService.getWithdrawalRequests();
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error: any) {
      alert('Error al solicitar retiro: ' + (error.message || 'Error desconocido'));
    }
  }

  /**
   * Maneja el cambio de cuenta por defecto
   */
  async handleSetDefaultAccount(accountId: string): Promise<void> {
    try {
      await this.withdrawalService.setDefaultBankAccount(accountId);
      alert('Cuenta establecida como predeterminada');
    } catch (error: any) {
      alert('Error: ' + (error.message || 'Error desconocido'));
    }
  }

  /**
   * Maneja la eliminación de cuenta bancaria
   */
  async handleDeleteAccount(accountId: string): Promise<void> {
    try {
      await this.withdrawalService.deleteBankAccount(accountId);
      alert('Cuenta eliminada exitosamente');
    } catch (error: any) {
      alert('Error al eliminar cuenta: ' + (error.message || 'Error desconocido'));
    }
  }

  /**
   * Maneja la cancelación de solicitud de retiro
   */
  async handleCancelWithdrawal(requestId: string): Promise<void> {
    try {
      await this.withdrawalService.cancelWithdrawalRequest(requestId);
      alert('Solicitud de retiro cancelada');
    } catch (error: any) {
      alert('Error al cancelar: ' + (error.message || 'Error desconocido'));
    }
  }

  /**
   * Recarga el historial de retiros
   */
  async handleRefreshWithdrawals(): Promise<void> {
    try {
      await this.withdrawalService.getWithdrawalRequests();
    } catch (error) {
      console.error('Error refreshing withdrawals:', error);
    }
  }

  /**
   * Obtiene el balance disponible para retiros
   */
  get availableBalance(): number {
    return this.balanceCard?.availableBalance() || 0;
  }

  /**
   * Obtiene las cuentas bancarias
   */
  get bankAccounts() {
    return this.withdrawalService.bankAccounts;
  }

  /**
   * Obtiene las cuentas bancarias activas
   */
  get activeBankAccounts() {
    return this.withdrawalService.activeBankAccounts;
  }

  /**
   * Obtiene la cuenta bancaria por defecto
   */
  get defaultBankAccount() {
    return this.withdrawalService.defaultBankAccount;
  }

  /**
   * Obtiene las solicitudes de retiro
   */
  get withdrawalRequests() {
    return this.withdrawalService.withdrawalRequests;
  }
}
