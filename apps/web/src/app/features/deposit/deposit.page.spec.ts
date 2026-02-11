import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@core/services/auth/auth.service';
import { PaymentsFeatureFacadeService } from '@core/services/facades/payments-feature-facade.service';
import { SessionFacadeService } from '@core/services/facades/session-facade.service';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { WalletService } from '@core/services/payments/wallet.service';
import { testProviders } from '@app/testing/test-providers';
import { DepositPage } from './deposit.page';

describe('DepositPage', () => {
  let component: DepositPage;
  let fixture: ComponentFixture<DepositPage>;
  let analyticsService: jasmine.SpyObj<AnalyticsService>;
  let notificationManagerService: jasmine.SpyObj<NotificationManagerService>;
  let paymentsFacade: jasmine.SpyObj<PaymentsFeatureFacadeService>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    analyticsService = jasmine.createSpyObj('AnalyticsService', ['trackEvent']);
    notificationManagerService = jasmine.createSpyObj('NotificationManagerService', [
      'success',
      'error',
      'warning',
      'show',
    ]);
    notificationManagerService.show.and.returnValue(Promise.resolve());

    const walletService = jasmine.createSpyObj<WalletService>('WalletService', []);
    const router = jasmine.createSpyObj<Router>('Router', ['navigate'], {
      url: '/wallet/deposit',
    });

    paymentsFacade = jasmine.createSpyObj<PaymentsFeatureFacadeService>('PaymentsFeatureFacadeService', [
      'getLatestUsdArsRate',
      'initiateWalletDeposit',
      'invokeFunction',
    ]);
    paymentsFacade.getLatestUsdArsRate.and.resolveTo(1200);
    paymentsFacade.initiateWalletDeposit.and.resolveTo('tx-1');
    paymentsFacade.invokeFunction.and.resolveTo({
      preference_id: 'pref-1',
      init_point: null,
      sandbox_init_point: null,
    });

    const sessionFacade = jasmine.createSpyObj<SessionFacadeService>('SessionFacadeService', [
      'getSessionAccessToken',
    ]);
    sessionFacade.getSessionAccessToken.and.resolveTo('access-token');

    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getCachedUserId']);
    authService.getCachedUserId.and.resolveTo('user-123');

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, TranslateModule.forRoot(), FormsModule],
      providers: [
        ...testProviders,
        { provide: WalletService, useValue: walletService },
        { provide: Router, useValue: router },
        { provide: AnalyticsService, useValue: analyticsService },
        { provide: NotificationManagerService, useValue: notificationManagerService },
        { provide: PaymentsFeatureFacadeService, useValue: paymentsFacade },
        { provide: SessionFacadeService, useValue: sessionFacade },
        { provide: AuthService, useValue: authService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParams: { source: 'test' },
            },
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(DepositPage, {
        set: {
          imports: [FormsModule, TranslateModule],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DepositPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('tracks page view on init', () => {
    expect(analyticsService.trackEvent).toHaveBeenCalledWith('deposit_page_viewed', {
      source: 'test',
    });
  });

  describe('loadExchangeRate', () => {
    it('sets platform rate on success', fakeAsync(() => {
      paymentsFacade.getLatestUsdArsRate.and.resolveTo(1234);
      void component.loadExchangeRate();
      tick();

      expect(component.platformRate()).toBe(1234);
      expect(component.loadingRate()).toBe(false);
    }));

    it('shows warning when rate is unavailable', fakeAsync(() => {
      paymentsFacade.getLatestUsdArsRate.and.resolveTo(null);
      void component.loadExchangeRate();
      tick();

      expect(component.platformRate()).toBeNull();
      expect(notificationManagerService.warning).toHaveBeenCalled();
      expect(component.loadingRate()).toBe(false);
    }));

    it('shows error when rate fetch fails', fakeAsync(() => {
      paymentsFacade.getLatestUsdArsRate.and.rejectWith(new Error('rate error'));
      void component.loadExchangeRate();
      tick();

      expect(component.platformRate()).toBeNull();
      expect(notificationManagerService.error).toHaveBeenCalled();
      expect(component.loadingRate()).toBe(false);
    }));
  });

  describe('onSubmit validation', () => {
    it('fails when amount is missing', async () => {
      component.usdAmountInput.set(0);
      await component.onSubmit();

      expect(component.formError()).toBe('Ingresa un monto válido');
    });

    it('handles auth failure with friendly error and support toast', async () => {
      component.platformRate.set(1200);
      component.updateUsdAmount(10);
      authService.getCachedUserId.and.resolveTo(null);

      await component.onSubmit();

      expect(component.formError()).toContain('No pudimos iniciar tu depósito');
      expect(notificationManagerService.show).toHaveBeenCalled();
    });
  });
});
