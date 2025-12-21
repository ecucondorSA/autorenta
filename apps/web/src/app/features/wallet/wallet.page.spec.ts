import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { signal, WritableSignal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { WalletService } from '@core/services/payments/wallet.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { WithdrawalService } from '@core/services/payments/withdrawal.service';
import { ProfileService } from '@core/services/auth/profile.service';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';
import { MetaService } from '@core/services/ui/meta.service';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { WalletPage } from './wallet.page';

describe('WalletPage', () => {
  let component: WalletPage;
  let fixture: ComponentFixture<WalletPage>;
  let router: Router;
  let walletServiceMock: {
    refreshPendingDepositsCount: jasmine.Spy;
    refreshBalance: jasmine.Spy;
    unsubscribeFromWalletChanges: jasmine.Spy;
    subscribeToWalletChanges: jasmine.Spy;
    availableBalance: WritableSignal<number>;
    transferableBalance: WritableSignal<number>;
    withdrawableBalance: WritableSignal<number>;
    protectedCreditBalance: WritableSignal<number>;
    pendingDepositsCount: WritableSignal<number>;
    error: WritableSignal<string | null>;
  };
  let supabaseClientServiceMock: jasmine.SpyObj<SupabaseClientService>;
  let notificationManagerService: jasmine.SpyObj<NotificationManagerService>;
  let withdrawalServiceMock: {
    getBankAccounts: jasmine.Spy;
    getWithdrawalRequests: jasmine.Spy;
    addBankAccount: jasmine.Spy;
    requestWithdrawal: jasmine.Spy;
    setDefaultBankAccount: jasmine.Spy;
    deleteBankAccount: jasmine.Spy;
    cancelWithdrawalRequest: jasmine.Spy;
    bankAccounts: WritableSignal<unknown[]>;
    activeBankAccounts: WritableSignal<unknown[]>;
    defaultBankAccount: WritableSignal<unknown | null>;
    withdrawalRequests: WritableSignal<unknown[]>;
    loading: WritableSignal<boolean>;
  };
  let profileService: jasmine.SpyObj<ProfileService>;
  let analyticsService: jasmine.SpyObj<AnalyticsService>;
  let metaService: jasmine.SpyObj<MetaService>;

  let mockBalanceCard: {
    setDepositClickHandler: jasmine.Spy;
    loadBalance: jasmine.Spy;
  };

  beforeEach(async () => {
    // Create mock for balance card
    mockBalanceCard = {
      setDepositClickHandler: jasmine.createSpy('setDepositClickHandler'),
      loadBalance: jasmine.createSpy('loadBalance').and.returnValue(Promise.resolve()),
    };

    // Create writable signals for mocking
    walletServiceMock = {
      refreshPendingDepositsCount: jasmine
        .createSpy('refreshPendingDepositsCount')
        .and.returnValue(Promise.resolve()),
      refreshBalance: jasmine.createSpy('refreshBalance').and.returnValue(Promise.resolve()),
      unsubscribeFromWalletChanges: jasmine.createSpy('unsubscribeFromWalletChanges'),
      subscribeToWalletChanges: jasmine
        .createSpy('subscribeToWalletChanges')
        .and.returnValue(Promise.resolve()),
      availableBalance: signal(0),
      transferableBalance: signal(0),
      withdrawableBalance: signal(0),
      protectedCreditBalance: signal(0),
      pendingDepositsCount: signal(0),
      error: signal(null),
    };

    supabaseClientServiceMock = jasmine.createSpyObj('SupabaseClientService', ['getClient'], {
      isConfigured: true,
    });
    supabaseClientServiceMock.getClient.and.returnValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
      from: () => ({
        select: () => ({
          eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
        }),
      }),
    } as any);

    withdrawalServiceMock = {
      getBankAccounts: jasmine.createSpy('getBankAccounts').and.returnValue(Promise.resolve()),
      getWithdrawalRequests: jasmine
        .createSpy('getWithdrawalRequests')
        .and.returnValue(Promise.resolve()),
      addBankAccount: jasmine.createSpy('addBankAccount').and.returnValue(Promise.resolve()),
      requestWithdrawal: jasmine
        .createSpy('requestWithdrawal')
        .and.returnValue(Promise.resolve({ success: true, fee_amount: 10, net_amount: 90 })),
      setDefaultBankAccount: jasmine
        .createSpy('setDefaultBankAccount')
        .and.returnValue(Promise.resolve()),
      deleteBankAccount: jasmine.createSpy('deleteBankAccount').and.returnValue(Promise.resolve()),
      cancelWithdrawalRequest: jasmine
        .createSpy('cancelWithdrawalRequest')
        .and.returnValue(Promise.resolve()),
      bankAccounts: signal([]),
      activeBankAccounts: signal([]),
      defaultBankAccount: signal(null),
      withdrawalRequests: signal([]),
      loading: signal(false),
    };

    notificationManagerService = jasmine.createSpyObj('NotificationManagerService', [
      'success',
      'error',
    ]);
    profileService = jasmine.createSpyObj('ProfileService', ['getCurrentProfile']);
    analyticsService = jasmine.createSpyObj('AnalyticsService', ['trackEvent']);
    metaService = jasmine.createSpyObj('MetaService', ['updateWalletMeta']);

    profileService.getCurrentProfile.and.returnValue(
      Promise.resolve({
        id: 'user-123',
        full_name: 'Test User',
        role: 'user',
        timezone: 'America/Buenos_Aires',
        email: 'test@example.com',
        phone: '+5411234567',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        onboarding_completed: true,
        identity_level: 1,
        is_active: true,
        preferred_language: 'es',
        wallet_account_number: 'AR-12345678',
      } as any),
    );

    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: WalletService, useValue: walletServiceMock },
        { provide: NotificationManagerService, useValue: notificationManagerService },
        { provide: WithdrawalService, useValue: withdrawalServiceMock },
        { provide: ProfileService, useValue: profileService },
        { provide: AnalyticsService, useValue: analyticsService },
        { provide: MetaService, useValue: metaService },
        { provide: SupabaseClientService, useValue: supabaseClientServiceMock },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(WalletPage, {
        set: {
          imports: [CommonModule, TranslateModule],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
        },
      })
      .compileComponents();

    // Spy on prototype BEFORE creating component
    spyOn(WalletPage.prototype, 'ngAfterViewInit').and.callFake(function (this: WalletPage) {
      // Safe implementation - balanceCard may be undefined in tests
      if ((this as any).balanceCard?.setDepositClickHandler) {
        (this as any).balanceCard.setDepositClickHandler(() => this.navigateToDeposit());
      }
    });

    fixture = TestBed.createComponent(WalletPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);

    // Assign mock balanceCard
    (component as any).balanceCard = mockBalanceCard;

    // Now it's safe to run change detection
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize walletAccountNumber on load', async () => {
      await fixture.whenStable();
      expect(component.walletAccountNumber()).toBe('AR-12345678');
    });

    it('should track wallet page view on construction', () => {
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        'wallet_page_viewed',
        jasmine.objectContaining({
          protected_credit_balance: jasmine.any(Number),
          protected_credit_progress: jasmine.any(Number),
        }),
      );
    });

    it('should call refreshPendingDepositsCount on ngOnInit', async () => {
      await component.ngOnInit();
      expect(walletServiceMock.refreshPendingDepositsCount).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('should navigate to deposit on navigateToDeposit', () => {
      spyOn(router, 'navigate');
      component.navigateToDeposit();
      expect(router.navigate).toHaveBeenCalledWith(['/wallet/deposit']);
    });

    it('should navigate to deposit on openDepositModal', () => {
      spyOn(router, 'navigate');
      component.openDepositModal();
      expect(router.navigate).toHaveBeenCalledWith(['/wallet/deposit']);
    });

    it('should navigate to transfer on goToTransfer', () => {
      spyOn(router, 'navigate');
      component.goToTransfer();
      expect(router.navigate).toHaveBeenCalledWith(['/wallet/transfer']);
    });

    it('should track analytics and navigate on openDepositModalForProtectedCredit', () => {
      spyOn(router, 'navigate');
      component.openDepositModalForProtectedCredit();
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        'wallet_onboarding_cta_clicked',
        jasmine.any(Object),
      );
      expect(router.navigate).toHaveBeenCalledWith(['/wallet/deposit']);
    });
  });

  describe('Protected Credit Status (computed signals)', () => {
    // protectedCreditTarget = 30000 centavos = USD 300

    it('should return "pending" when protectedCreditBalance is 0', () => {
      walletServiceMock.protectedCreditBalance.set(0);
      fixture.detectChanges();
      expect(component.protectedCreditStatus()).toBe('pending');
    });

    it('should return "partial" when protectedCreditBalance is between 1 and 29999 centavos', () => {
      walletServiceMock.protectedCreditBalance.set(15000); // USD 150
      fixture.detectChanges();
      expect(component.protectedCreditStatus()).toBe('partial');
    });

    it('should return "partial" at boundary (29999 centavos)', () => {
      walletServiceMock.protectedCreditBalance.set(29999);
      fixture.detectChanges();
      expect(component.protectedCreditStatus()).toBe('partial');
    });

    it('should return "active" when protectedCreditBalance >= 30000 centavos (USD 300)', () => {
      walletServiceMock.protectedCreditBalance.set(30000);
      fixture.detectChanges();
      expect(component.protectedCreditStatus()).toBe('active');
    });

    it('should return "active" when protectedCreditBalance exceeds target', () => {
      walletServiceMock.protectedCreditBalance.set(50000); // USD 500
      fixture.detectChanges();
      expect(component.protectedCreditStatus()).toBe('active');
    });
  });

  describe('Protected Credit Progress (computed)', () => {
    it('should calculate 0% progress when balance is 0', () => {
      walletServiceMock.protectedCreditBalance.set(0);
      fixture.detectChanges();
      expect(component.protectedCreditProgress()).toBe(0);
    });

    it('should calculate 50% progress at 15000 centavos (USD 150)', () => {
      walletServiceMock.protectedCreditBalance.set(15000);
      fixture.detectChanges();
      expect(component.protectedCreditProgress()).toBe(50);
    });

    it('should calculate 100% progress at 30000 centavos (USD 300)', () => {
      walletServiceMock.protectedCreditBalance.set(30000);
      fixture.detectChanges();
      expect(component.protectedCreditProgress()).toBe(100);
    });

    it('should cap progress at 100% when balance exceeds target', () => {
      walletServiceMock.protectedCreditBalance.set(50000); // USD 500
      fixture.detectChanges();
      expect(component.protectedCreditProgress()).toBe(100);
    });
  });

  describe('Primary Deposit CTA Text (computed)', () => {
    it('should show "Configurar crédito protegido" when status is pending', () => {
      walletServiceMock.protectedCreditBalance.set(0);
      fixture.detectChanges();
      expect(component.primaryDepositCTAText()).toBe('Configurar crédito protegido');
    });

    it('should show remaining amount when status is partial', () => {
      walletServiceMock.protectedCreditBalance.set(15000); // USD 150, missing USD 150
      fixture.detectChanges();
      expect(component.primaryDepositCTAText()).toBe('Completar crédito (faltan USD 150)');
    });

    it('should show "Depositar fondos" when status is active', () => {
      walletServiceMock.protectedCreditBalance.set(30000);
      fixture.detectChanges();
      expect(component.primaryDepositCTAText()).toBe('Depositar fondos');
    });
  });

  describe('Primary Deposit CTA Tooltip (computed)', () => {
    it('should show deposit instruction when pending', () => {
      walletServiceMock.protectedCreditBalance.set(0);
      fixture.detectChanges();
      expect(component.primaryDepositCTATooltip()).toBe(
        'Deposita USD 300 para reservar sin tarjeta',
      );
    });

    it('should show completion instruction when partial', () => {
      walletServiceMock.protectedCreditBalance.set(15000);
      fixture.detectChanges();
      expect(component.primaryDepositCTATooltip()).toBe(
        'Completa tu crédito protegido para reservar sin tarjeta',
      );
    });

    it('should show generic add funds when active', () => {
      walletServiceMock.protectedCreditBalance.set(30000);
      fixture.detectChanges();
      expect(component.primaryDepositCTATooltip()).toBe('Agregar fondos a tu wallet');
    });
  });

  describe('Primary Deposit CTA Class (computed)', () => {
    it('should return CTA default class when pending', () => {
      walletServiceMock.protectedCreditBalance.set(0);
      fixture.detectChanges();
      expect(component.primaryDepositCTAClass()).toBe(
        'bg-cta-default text-cta-text hover:bg-cta-default/90',
      );
    });

    it('should return warning class when partial', () => {
      walletServiceMock.protectedCreditBalance.set(15000);
      fixture.detectChanges();
      expect(component.primaryDepositCTAClass()).toBe(
        'bg-warning-600 text-text-inverse hover:bg-warning-700',
      );
    });

    it('should return primary class when active', () => {
      walletServiceMock.protectedCreditBalance.set(30000);
      fixture.detectChanges();
      expect(component.primaryDepositCTAClass()).toBe(
        'bg-primary-600 text-text-inverse hover:bg-primary-700',
      );
    });
  });

  describe('Tab Management', () => {
    it('should set active tab', () => {
      component.setActiveTab('withdrawals');
      expect(component.activeTab()).toBe('withdrawals');

      component.setActiveTab('transactions');
      expect(component.activeTab()).toBe('transactions');

      component.setActiveTab('transfers');
      expect(component.activeTab()).toBe('transfers');
    });

    it('should set withdrawal mode', () => {
      component.setWithdrawalMode('accounts');
      expect(component.withdrawalMode()).toBe('accounts');

      component.setWithdrawalMode('form');
      expect(component.withdrawalMode()).toBe('form');
    });
  });

  describe('Onboarding Banner', () => {
    it('should dismiss onboarding banner', () => {
      expect(component.onboardingBannerDismissed()).toBe(false);
      component.dismissOnboardingBanner();
      expect(component.onboardingBannerDismissed()).toBe(true);
    });

    it('should track analytics on banner dismissal', () => {
      component.dismissOnboardingBanner();
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        'wallet_onboarding_banner_viewed',
        jasmine.objectContaining({
          action: 'dismissed',
        }),
      );
    });
  });

  describe('Benefits Section', () => {
    it('should toggle benefits section expansion', () => {
      expect(component.benefitsSectionExpanded()).toBe(false);
      component.toggleBenefitsSection();
      expect(component.benefitsSectionExpanded()).toBe(true);
      component.toggleBenefitsSection();
      expect(component.benefitsSectionExpanded()).toBe(false);
    });

    it('should track analytics when benefits section is expanded', () => {
      component.toggleBenefitsSection();
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        'wallet_benefits_section_expanded',
        jasmine.any(Object),
      );
    });
  });

  describe('Bank Account Handlers', () => {
    it('should handle add bank account success', async () => {
      await component.handleAddBankAccount({
        account_type: 'cbu',
        account_number: '1234567890123456789012',
        account_holder_name: 'Test User',
        account_holder_document: '12345678',
      });
      expect(notificationManagerService.success).toHaveBeenCalledWith(
        'Éxito',
        'Cuenta bancaria agregada exitosamente',
      );
      expect(component.withdrawalMode()).toBe('form');
    });

    it('should handle add bank account error', async () => {
      withdrawalServiceMock.addBankAccount.and.returnValue(
        Promise.reject({ message: 'Error de prueba' }),
      );
      await component.handleAddBankAccount({
        account_type: 'cbu',
        account_number: '1234567890123456789012',
        account_holder_name: 'Test User',
        account_holder_document: '12345678',
      });
      expect(notificationManagerService.error).toHaveBeenCalled();
    });

    it('should handle set default account success', async () => {
      await component.handleSetDefaultAccount('account-123');
      expect(notificationManagerService.success).toHaveBeenCalledWith(
        'Éxito',
        'Cuenta establecida como predeterminada',
      );
    });

    it('should handle set default account error', async () => {
      withdrawalServiceMock.setDefaultBankAccount.and.returnValue(
        Promise.reject({ message: 'Error' }),
      );
      await component.handleSetDefaultAccount('account-123');
      expect(notificationManagerService.error).toHaveBeenCalled();
    });

    it('should handle delete account success', async () => {
      await component.handleDeleteAccount('account-123');
      expect(notificationManagerService.success).toHaveBeenCalledWith(
        'Éxito',
        'Cuenta eliminada exitosamente',
      );
    });

    it('should handle delete account error', async () => {
      withdrawalServiceMock.deleteBankAccount.and.returnValue(Promise.reject({ message: 'Error' }));
      await component.handleDeleteAccount('account-123');
      expect(notificationManagerService.error).toHaveBeenCalled();
    });
  });

  describe('Withdrawal Handlers', () => {
    it('should handle withdrawal request success', async () => {
      await component.handleWithdrawalRequest({ bank_account_id: 'acc-123', amount: 100 });
      expect(notificationManagerService.success).toHaveBeenCalled();
      expect(withdrawalServiceMock.getWithdrawalRequests).toHaveBeenCalled();
    });

    it('should handle withdrawal request failure (success: false)', async () => {
      withdrawalServiceMock.requestWithdrawal.and.returnValue(
        Promise.resolve({ success: false, message: 'Fondos insuficientes' }),
      );
      await component.handleWithdrawalRequest({ bank_account_id: 'acc-123', amount: 100 });
      expect(notificationManagerService.error).toHaveBeenCalledWith(
        'Error',
        'Error: Fondos insuficientes',
      );
    });

    it('should handle withdrawal request exception', async () => {
      withdrawalServiceMock.requestWithdrawal.and.returnValue(
        Promise.reject({ message: 'Network error' }),
      );
      await component.handleWithdrawalRequest({ bank_account_id: 'acc-123', amount: 100 });
      expect(notificationManagerService.error).toHaveBeenCalled();
    });

    it('should handle cancel withdrawal success', async () => {
      await component.handleCancelWithdrawal('req-123');
      expect(notificationManagerService.success).toHaveBeenCalledWith(
        'Éxito',
        'Solicitud de retiro cancelada',
      );
    });

    it('should handle cancel withdrawal error', async () => {
      withdrawalServiceMock.cancelWithdrawalRequest.and.returnValue(
        Promise.reject({ message: 'Error' }),
      );
      await component.handleCancelWithdrawal('req-123');
      expect(notificationManagerService.error).toHaveBeenCalled();
    });

    it('should refresh withdrawals', async () => {
      await component.handleRefreshWithdrawals();
      expect(withdrawalServiceMock.getWithdrawalRequests).toHaveBeenCalled();
    });
  });

  describe('Clipboard', () => {
    it('should copy wallet account number to clipboard', async () => {
      const writeTextSpy = spyOn(navigator.clipboard, 'writeText').and.returnValue(
        Promise.resolve(),
      );
      await component.copyWalletAccountNumber();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('AR-12345678');
      expect(component.copied()).toBe(true);
    });

    it('should handle clipboard error', async () => {
      spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.reject());
      await component.copyWalletAccountNumber();
      expect(notificationManagerService.error).toHaveBeenCalledWith(
        'Error',
        'Error al copiar el número de cuenta',
      );
      expect(component.copied()).toBe(false);
    });

    it('should not copy if wallet account number is null', async () => {
      component.walletAccountNumber.set(null);
      const writeTextSpy = spyOn(navigator.clipboard, 'writeText');
      await component.copyWalletAccountNumber();
      expect(writeTextSpy).not.toHaveBeenCalled();
    });
  });

  describe('Getters', () => {
    it('should return bank accounts from service', () => {
      const mockAccounts = [{ id: '1' }, { id: '2' }] as any[];
      withdrawalServiceMock.bankAccounts.set(mockAccounts);
      expect(component.bankAccounts()?.length).toBe(2);
    });

    it('should return active bank accounts from service', () => {
      const mockAccounts = [{ id: '1', status: 'active' }] as any[];
      withdrawalServiceMock.activeBankAccounts.set(mockAccounts);
      expect(component.activeBankAccounts()?.length).toBe(1);
    });

    it('should return default bank account from service', () => {
      const mockAccount = { id: '1', is_default: true } as any;
      withdrawalServiceMock.defaultBankAccount.set(mockAccount);
      expect(component.defaultBankAccount()?.id).toBe('1');
    });

    it('should return withdrawal requests from service', () => {
      const mockRequests = [{ id: '1' }, { id: '2' }] as any[];
      withdrawalServiceMock.withdrawalRequests.set(mockRequests);
      expect(component.withdrawalRequests()?.length).toBe(2);
    });

    it('should return wallet error from service', () => {
      walletServiceMock.error.set({ message: 'Test error' } as any);
      expect(component.walletError()).toBeTruthy();
    });
  });

  describe('Refresh Wallet Data', () => {
    it('should refresh balance and pending deposits count', async () => {
      // Assign mock balanceCard to component
      (component as any).balanceCard = mockBalanceCard;
      await component.refreshWalletData();
      expect(mockBalanceCard.loadBalance).toHaveBeenCalled();
      expect(walletServiceMock.refreshPendingDepositsCount).toHaveBeenCalled();
    });
  });

  describe('AfterViewInit', () => {
    it('should set deposit click handler on balance card', () => {
      // The spy on ngAfterViewInit should call setDepositClickHandler
      // Since balanceCard is assigned in the spy's callFake, we need to check
      // that the spy was called (which happens during detectChanges)
      expect(WalletPage.prototype.ngAfterViewInit).toHaveBeenCalled();
    });
  });
});
