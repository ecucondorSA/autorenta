import { CommonModule } from '@angular/common';
import {AfterViewInit,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  ViewChild,
  ChangeDetectionStrategy} from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import type { AddBankAccountParams, RequestWithdrawalParams } from '../../core/models/wallet.model';
import { AnalyticsService } from '../../core/services/analytics.service';
import { MetaService } from '../../core/services/meta.service';
import { NotificationManagerService } from '../../core/services/notification-manager.service';
import { ProfileService } from '../../core/services/profile.service';
import { WalletService } from '../../core/services/wallet.service';
import { WithdrawalService } from '../../core/services/withdrawal.service';
import { BankAccountFormComponent } from '../../shared/components/bank-account-form/bank-account-form.component';
import { BankAccountsListComponent } from '../../shared/components/bank-accounts-list/bank-accounts-list.component';

import { TransactionHistoryComponent } from '../../shared/components/transaction-history/transaction-history.component';
import { WalletBalanceCardComponent } from '../../shared/components/wallet-balance-card/wallet-balance-card.component';
import { WithdrawalHistoryComponent } from '../../shared/components/withdrawal-history/withdrawal-history.component';
import { WithdrawalRequestFormComponent } from '../../shared/components/withdrawal-request-form/withdrawal-request-form.component';

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
import { IconComponent } from '../../shared/components/icon/icon.component';
import { WalletAccountNumberCardComponent } from '../../shared/components/wallet-account-number-card/wallet-account-number-card.component';
import { WalletFaqComponent } from './components/wallet-faq.component';
import { WalletTransfersComponent } from './components/wallet-transfers.component';

@Component({
  selector: 'app-wallet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    WalletBalanceCardComponent,
    TransactionHistoryComponent,
    BankAccountFormComponent,
    BankAccountsListComponent,
    WithdrawalRequestFormComponent,
    WithdrawalHistoryComponent,
    TranslateModule,
    WalletAccountNumberCardComponent,
    GuaranteeOptionsInfoComponent,
    WalletFaqComponent,
    WalletTransfersComponent,
    IconComponent,
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
   * Tab activa (transactions | withdrawals)
   */
  /**
   * Tab activa (transactions | withdrawals)
   */
  activeTab = signal<'transactions' | 'withdrawals' | 'transfers'>('transactions');

  /**
   * Tabs definition for the view
   */
  readonly tabs = [
    { id: 'transactions', label: 'Transacciones' },
    { id: 'withdrawals', label: 'Retiros' },
  ];

  /**
   * Modo de retiro (form | accounts)
   */
  withdrawalMode = signal<'form' | 'accounts'>('form');

  /**
   * Estado de carga
   */
  loading = computed(() => this.withdrawalService.loading());

  /**
   * Control de visibilidad del banner de onboarding
   */
  readonly onboardingBannerDismissed = signal(false);

  /**
   * Controla si ya se trackeó la vista del banner
   */
  private bannerViewTracked = false;

  /**
   * Control de expansión de la sección de beneficios
   */
  readonly benefitsSectionExpanded = signal(false);

  private readonly walletService = inject(WalletService);
  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);
  private readonly toastService = inject(NotificationManagerService);
  private readonly analyticsService = inject(AnalyticsService);

  /**
   * Wallet Account Number del usuario actual
   */
  readonly walletAccountNumber = signal<string | null>(null);

  /**
   * Estado de copiado del WAN
   */
  readonly copied = signal(false);

  /**
   * Error from wallet service (if any)
   */
  readonly walletError = computed(() => this.walletService.error());

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

  /**
   * Texto dinámico para el CTA principal de depósito
   */
  readonly primaryDepositCTAText = computed(() => {
    const status = this.protectedCreditStatus();
    const balance = this.protectedCreditBalance();

    if (status === 'pending') {
      return 'Configurar crédito protegido';
    } else if (status === 'partial') {
      const remaining = (this.protectedCreditTarget - balance) / 100;
      return `Completar crédito (faltan USD ${remaining.toFixed(0)})`;
    } else {
      return 'Depositar fondos';
    }
  });

  /**
   * Tooltip/descripción para el CTA principal
   */
  readonly primaryDepositCTATooltip = computed(() => {
    const status = this.protectedCreditStatus();

    if (status === 'pending') {
      return 'Deposita USD 300 para reservar sin tarjeta';
    } else if (status === 'partial') {
      return 'Completa tu crédito protegido para reservar sin tarjeta';
    } else {
      return 'Agregar fondos a tu wallet';
    }
  });

  /**
   * Clase CSS para el CTA principal (cambia color según urgencia)
   */
  readonly primaryDepositCTAClass = computed(() => {
    const status = this.protectedCreditStatus();

    if (status === 'pending') {
      return 'bg-cta-default text-cta-text hover:bg-cta-default/90';
    } else if (status === 'partial') {
      return 'bg-warning-600 text-text-inverse hover:bg-warning-700';
    } else {
      return 'bg-primary-600 text-text-inverse hover:bg-primary-700';
    }
  });

  constructor(
    private withdrawalService: WithdrawalService,
    private metaService: MetaService,
  ) {
    // Update SEO meta tags (private page)
    this.metaService.updateWalletMeta();

    // Track wallet page view
    this.analyticsService.trackEvent('wallet_page_viewed', {
      protected_credit_balance: this.protectedCreditBalance(),
      protected_credit_progress: this.protectedCreditProgress(),
    });

    // Track onboarding banner view (only once per session)
    effect(() => {
      if (
        this.protectedCreditStatus() === 'pending' &&
        !this.onboardingBannerDismissed() &&
        !this.bannerViewTracked
      ) {
        this.analyticsService.trackEvent('wallet_onboarding_banner_viewed', {
          protected_credit_balance: this.protectedCreditBalance(),
        });
        this.bannerViewTracked = true;
      }
    });

    // Cargar datos al iniciar (en paralelo para mejor performance)
    void Promise.all([this.loadWithdrawalData(), this.loadWalletAccountNumber()]);
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.walletService.refreshPendingDepositsCount();
    } catch {
      /* Silenced */
    }
  }

  /**
   * Configura el balance card después de que la vista se inicialice
   */
  ngAfterViewInit(): void {
    if (this.balanceCard) {
      this.balanceCard.setDepositClickHandler(() => this.navigateToDeposit());
    }
  }

  /**
   * Navega a la página de depósito
   */
  navigateToDeposit(amount?: number): void {
    if (amount) {
      void this.router.navigate(['/wallet/deposit'], { queryParams: { amount } });
    } else {
      void this.router.navigate(['/wallet/deposit']);
    }
  }

  /**
   * Navega a la página de depósito (alias para compatibilidad)
   */
  openDepositModal(amount?: number): void {
    this.navigateToDeposit(amount);
  }

  /**
   * Navega a la página de depósito con analytics para crédito protegido
   */
  openDepositModalForProtectedCredit(): void {
    // Track analytics event
    this.analyticsService.trackEvent('wallet_onboarding_cta_clicked', {
      protected_credit_balance: this.protectedCreditBalance(),
      protected_credit_progress: this.protectedCreditProgress(),
    });

    // Navigate to deposit page
    this.navigateToDeposit();
  }

  /**
   * Dismiss the onboarding banner
   */
  dismissOnboardingBanner(): void {
    this.onboardingBannerDismissed.set(true);

    // Track dismissal
    this.analyticsService.trackEvent('wallet_onboarding_banner_viewed', {
      protected_credit_balance: this.protectedCreditBalance(),
      action: 'dismissed',
    });
  }

  /**
   * Toggle benefits section expansion
   */
  toggleBenefitsSection(): void {
    const newState = !this.benefitsSectionExpanded();
    this.benefitsSectionExpanded.set(newState);

    // Track expansion
    if (newState) {
      this.analyticsService.trackEvent('wallet_benefits_section_expanded', {
        protected_credit_status: this.protectedCreditStatus(),
        protected_credit_balance: this.protectedCreditBalance(),
      });
    }
  }

  /**
   * Cambia el tab activo
   */
  setActiveTab(tab: 'transactions' | 'withdrawals' | 'transfers'): void {
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
    } catch {
      /* Silenced */
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
    } catch {
      /* Silenced */
    }
  }

  /**
   * Maneja la creación de una cuenta bancaria
   */
  async handleAddBankAccount(params: AddBankAccountParams): Promise<void> {
    try {
      await this.withdrawalService.addBankAccount(params);
      this.toastService.success('Éxito', 'Cuenta bancaria agregada exitosamente');
      this.setWithdrawalMode('form');
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      this.toastService.error(
        'Error',
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
          'Éxito',
          `Retiro solicitado exitosamente! Monto: $${params.amount}, Comisión: $${result.fee_amount}, Neto: $${result.net_amount}`,
        );
        // Recargar historial
        await this.withdrawalService.getWithdrawalRequests();
      } else {
        this.toastService.error('Error', 'Error: ' + result.message);
      }
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      this.toastService.error(
        'Error',
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
      this.toastService.success('Éxito', 'Cuenta establecida como predeterminada');
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      this.toastService.error('Error', 'Error: ' + (errorObj.message || 'Error desconocido'));
    }
  }

  /**
   * Maneja la eliminación de cuenta bancaria
   */
  async handleDeleteAccount(accountId: string): Promise<void> {
    try {
      await this.withdrawalService.deleteBankAccount(accountId);
      this.toastService.success('Éxito', 'Cuenta eliminada exitosamente');
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      this.toastService.error(
        'Error',
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
      this.toastService.success('Éxito', 'Solicitud de retiro cancelada');
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      this.toastService.error(
        'Error',
        'Error al cancelar: ' + (errorObj.message || 'Error desconocido'),
      );
    }
  }

  /**
   * Recarga el historial de retiros
   */
  async handleRefreshWithdrawals(): Promise<void> {
    try {
      await this.withdrawalService.getWithdrawalRequests();
    } catch {
      /* Silenced */
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
    } catch {
      /* Silenced */
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
    } catch {
      this.toastService.error('Error', 'Error al copiar el número de cuenta');
    }
  }
}
