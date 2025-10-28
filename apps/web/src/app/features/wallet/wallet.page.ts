import {
  Component,
  signal,
  ViewChild,
  AfterViewInit,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { WalletBalanceCardComponent } from '../../shared/components/wallet-balance-card/wallet-balance-card.component';
import { DepositModalComponent } from '../../shared/components/deposit-modal/deposit-modal.component';
import { TransactionHistoryComponent } from '../../shared/components/transaction-history/transaction-history.component';
import { BankAccountFormComponent } from '../../shared/components/bank-account-form/bank-account-form.component';
import { BankAccountsListComponent } from '../../shared/components/bank-accounts-list/bank-accounts-list.component';
import { WithdrawalRequestFormComponent } from '../../shared/components/withdrawal-request-form/withdrawal-request-form.component';
import { WithdrawalHistoryComponent } from '../../shared/components/withdrawal-history/withdrawal-history.component';
import { WithdrawalService } from '../../core/services/withdrawal.service';
import type { AddBankAccountParams, RequestWithdrawalParams } from '../../core/models/wallet.model';
import { WalletService } from '../../core/services/wallet.service';
import { MetaService } from '../../core/services/meta.service';
import { ProfileService } from '../../core/services/profile.service';
import { ToastService } from '../../core/services/toast.service';

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
import { GuaranteeOptionsInfoComponent } from '../../shared/components/guarantee-options-info/guarantee-options-info.component';
import { WalletAccountNumberCardComponent } from '../../shared/components/wallet-account-number-card/wallet-account-number-card.component';

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
    TranslateModule,
    WalletAccountNumberCardComponent,
    GuaranteeOptionsInfoComponent,
  ],
  templateUrl: './wallet.page.html',
  styleUrls: ['./wallet.page.css'],
})
export class WalletPage implements AfterViewInit, OnInit {
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

  private readonly walletService = inject(WalletService);
  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);
  private readonly toastService = inject(ToastService);

  /**
   * Wallet Account Number del usuario actual
   */
  readonly walletAccountNumber = signal<string | null>(null);

  /**
   * Estado de copiado del WAN
   */
  readonly copied = signal(false);

  /**
   * Target de crédito protegido (USD 300 = 30000 centavos)
   */
  readonly protectedCreditTarget = 30000;

  /**
   * Balance disponible en el wallet
   */
  readonly availableBalanceSummary = this.walletService.availableBalance;

  /**
   * Fondos transferibles dentro de la app o a otros usuarios
   */
  readonly transferableBalance = this.walletService.transferableBalance;

  /**
   * Fondos retirables a cuenta bancaria externa (off-ramp)
   */
  readonly withdrawableBalance = this.walletService.withdrawableBalance;

  /**
   * Crédito Autorentar (meta inicial USD 300, no retirable)
   */
  readonly protectedCreditBalance = this.walletService.protectedCreditBalance;

  /**
   * Depósitos pendientes
   */
  readonly pendingDepositsCount = this.walletService.pendingDepositsCount;

  /**
   * Estado del crédito protegido (pending | partial | active)
   */
  readonly protectedCreditStatus = computed<'pending' | 'partial' | 'active'>(() => {
    const protectedAmount = this.protectedCreditBalance();
    if (protectedAmount >= this.protectedCreditTarget) {
      return 'active';
    }
    if (protectedAmount > 0) {
      return 'partial';
    }
    return 'pending';
  });

  /**
   * Porcentaje de progreso hacia el crédito objetivo
   */
  readonly protectedCreditProgress = computed(() => {
    const progress = (this.protectedCreditBalance() / this.protectedCreditTarget) * 100;
    return Math.min(progress, 100);
  });

  constructor(
    private withdrawalService: WithdrawalService,
    private metaService: MetaService,
  ) {
    // Update SEO meta tags (private page)
    this.metaService.updateWalletMeta();

    // Cargar datos al iniciar
    this.loadWithdrawalData();
    this.loadWalletAccountNumber();
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.walletService.refreshPendingDepositsCount();
    } catch (error) {
    }
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
   * Refresh manual del balance y depósitos pendientes
   */
  async refreshWalletData(): Promise<void> {
    try {
      const balanceRefresh = this.balanceCard ? this.balanceCard.loadBalance() : Promise.resolve();
      await Promise.all([balanceRefresh, this.walletService.refreshPendingDepositsCount()]);
    } catch (error) {
    }
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
    }
  }

  /**
   * Maneja la creación de una cuenta bancaria
   */
  async handleAddBankAccount(params: AddBankAccountParams): Promise<void> {
    try {
      await this.withdrawalService.addBankAccount(params);
      this.toastService.success('Cuenta bancaria agregada exitosamente');
      this.setWithdrawalMode('form');
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      this.toastService.error(
        'Error al agregar cuenta bancaria: ' + (errorObj.message || 'Error desconocido'),
      );
    }
  }

  /**
   * Maneja la solicitud de retiro
   */
  async handleWithdrawalRequest(params: RequestWithdrawalParams): Promise<void> {
    try {
      const result = await this.withdrawalService.requestWithdrawal(params);
      if (result.success) {
        this.toastService.success(
          `Retiro solicitado exitosamente! Monto: $${params.amount}, Comisión: $${result.fee_amount}, Neto: $${result.net_amount}`,
        );
        // Recargar historial
        await this.withdrawalService.getWithdrawalRequests();
      } else {
        this.toastService.error('Error: ' + result.message);
      }
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      this.toastService.error(
        'Error al solicitar retiro: ' + (errorObj.message || 'Error desconocido'),
      );
    }
  }

  /**
   * Maneja el cambio de cuenta por defecto
   */
  async handleSetDefaultAccount(accountId: string): Promise<void> {
    try {
      await this.withdrawalService.setDefaultBankAccount(accountId);
      this.toastService.success('Cuenta establecida como predeterminada');
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      this.toastService.error('Error: ' + (errorObj.message || 'Error desconocido'));
    }
  }

  /**
   * Maneja la eliminación de cuenta bancaria
   */
  async handleDeleteAccount(accountId: string): Promise<void> {
    try {
      await this.withdrawalService.deleteBankAccount(accountId);
      this.toastService.success('Cuenta eliminada exitosamente');
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      this.toastService.error(
        'Error al eliminar cuenta: ' + (errorObj.message || 'Error desconocido'),
      );
    }
  }

  /**
   * Maneja la cancelación de solicitud de retiro
   */
  async handleCancelWithdrawal(requestId: string): Promise<void> {
    try {
      await this.withdrawalService.cancelWithdrawalRequest(requestId);
      this.toastService.success('Solicitud de retiro cancelada');
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      this.toastService.error('Error al cancelar: ' + (errorObj.message || 'Error desconocido'));
    }
  }

  /**
   * Recarga el historial de retiros
   */
  async handleRefreshWithdrawals(): Promise<void> {
    try {
      await this.withdrawalService.getWithdrawalRequests();
    } catch (error) {
    }
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

  /**
   * Carga el Wallet Account Number del usuario actual
   */
  private async loadWalletAccountNumber(): Promise<void> {
    try {
      const profile = await this.profileService.getCurrentProfile();
      if (profile?.wallet_account_number) {
        this.walletAccountNumber.set(profile.wallet_account_number);
      }
    } catch (error) {
    }
  }

  /**
   * Navega a la página de transferencias
   */
  goToTransfer(): void {
    void this.router.navigate(['/wallet/transfer']);
  }

  /**
   * Copia el Wallet Account Number al portapapeles
   */
  async copyWalletAccountNumber(): Promise<void> {
    const wan = this.walletAccountNumber();
    if (!wan) return;

    try {
      await navigator.clipboard.writeText(wan);
      this.copied.set(true);

      // Reset copied state after 2 seconds
      setTimeout(() => {
        this.copied.set(false);
      }, 2000);
    } catch (error) {
      this.toastService.error('Error al copiar el número de cuenta');
    }
  }
}
