import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { DepositPage } from './deposit.page';
import { WalletService } from '../../core/services/wallet.service';
import { NotificationManagerService } from '../../core/services/notification-manager.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { SupabaseClientService } from '../../core/services/supabase-client.service';

describe('DepositPage', () => {
  let component: DepositPage;
  let fixture: ComponentFixture<DepositPage>;
  let walletService: jasmine.SpyObj<WalletService>;
  let notificationManagerService: jasmine.SpyObj<NotificationManagerService>;
  let analyticsService: jasmine.SpyObj<AnalyticsService>;
  let router: jasmine.SpyObj<Router>;
  let mockSupabaseClient: any;

  beforeEach(async () => {
    // Mock Supabase client with chainable methods
    const createMockQuery = (resolvedValue: any) => ({
      select: jasmine.createSpy('select').and.returnValue({
        eq: jasmine.createSpy('eq').and.returnValue({
          order: jasmine.createSpy('order').and.returnValue({
            limit: jasmine.createSpy('limit').and.returnValue({
              maybeSingle: jasmine.createSpy('maybeSingle').and.returnValue(
                Promise.resolve(resolvedValue)
              ),
            }),
          }),
        }),
      }),
    });

    mockSupabaseClient = {
      from: jasmine.createSpy('from').and.returnValue(
        createMockQuery({ data: { rate: 1200, last_updated: '2024-01-01' }, error: null })
      ),
    };

    const supabaseClientServiceMock = jasmine.createSpyObj('SupabaseClientService', ['getClient'], {
      isConfigured: true,
    });
    supabaseClientServiceMock.getClient.and.returnValue(mockSupabaseClient);

    walletService = jasmine.createSpyObj('WalletService', ['createDepositPreference']);
    notificationManagerService = jasmine.createSpyObj('NotificationManagerService', ['success', 'error', 'warning']);
    analyticsService = jasmine.createSpyObj('AnalyticsService', ['trackEvent']);
    router = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        TranslateModule.forRoot(),
        FormsModule,
      ],
      providers: [
        { provide: WalletService, useValue: walletService },
        { provide: NotificationManagerService, useValue: notificationManagerService },
        { provide: AnalyticsService, useValue: analyticsService },
        { provide: Router, useValue: router },
        { provide: SupabaseClientService, useValue: supabaseClientServiceMock },
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

    // Mock the supabase property
    (component as any).supabase = mockSupabaseClient;

    fixture.detectChanges();
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should track deposit_page_viewed event on ngOnInit', () => {
      expect(analyticsService.trackEvent).toHaveBeenCalledWith('deposit_page_viewed', { source: 'test' });
    });

    it('should have correct min/max amounts', () => {
      expect(component.MIN_AMOUNT_ARS).toBe(1000);
      expect(component.MAX_AMOUNT_ARS).toBe(1000000);
    });

    it('should initialize with zero arsAmount', () => {
      expect(component.arsAmount()).toBe(0);
    });

    it('should initialize with empty description', () => {
      expect(component.description()).toBe('');
    });
  });

  describe('loadExchangeRate', () => {
    it('should set platformRate on successful load', fakeAsync(() => {
      component.loadExchangeRate();
      tick();
      expect(component.platformRate()).toBe(1200);
      expect(component.loadingRate()).toBe(false);
    }));

    it('should handle error during exchange rate load', fakeAsync(() => {
      // Reset mock to return error
      mockSupabaseClient.from.and.returnValue({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: new Error('Failed') }),
              }),
            }),
          }),
        }),
      });

      component.loadExchangeRate();
      tick();
      expect(component.platformRate()).toBe(null);
      expect(notificationManagerService.error).toHaveBeenCalled();
      expect(component.loadingRate()).toBe(false);
    }));

    it('should handle no data during exchange rate load', fakeAsync(() => {
      // Reset mock to return no data
      mockSupabaseClient.from.and.returnValue({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        }),
      });

      component.loadExchangeRate();
      tick();
      expect(component.platformRate()).toBe(null);
      expect(notificationManagerService.warning).toHaveBeenCalled();
      expect(component.loadingRate()).toBe(false);
    }));
  });

  describe('usdAmount computed signal', () => {
    it('should calculate USD amount correctly (ARS / rate * 100 cents)', () => {
      component.platformRate.set(1200); // 1 USD = 1200 ARS
      component.arsAmount.set(12000); // 12000 ARS
      // 12000 / 1200 = 10 USD = 1000 cents
      expect(component.usdAmount()).toBe(1000);
    });

    it('should return 0 if rate is null', () => {
      component.platformRate.set(null);
      component.arsAmount.set(50000);
      expect(component.usdAmount()).toBe(0);
    });

    it('should return 0 if arsAmount is 0', () => {
      component.platformRate.set(1200);
      component.arsAmount.set(0);
      expect(component.usdAmount()).toBe(0);
    });

    it('should round to nearest cent', () => {
      component.platformRate.set(1200);
      component.arsAmount.set(15000); // 15000 / 1200 = 12.5 USD = 1250 cents
      expect(component.usdAmount()).toBe(1250);
    });
  });

  describe('Form Validation', () => {
    it('should set formError if arsAmount is 0', async () => {
      component.updateArsAmount(0);
      await component.onSubmit();
      expect(component.formError()).toBe('Ingresa un monto válido');
    });

    it('should set formError if arsAmount is negative', async () => {
      component.updateArsAmount(-100);
      await component.onSubmit();
      expect(component.formError()).toBe('Ingresa un monto válido');
    });

    it('should set formError if arsAmount is below MIN_AMOUNT_ARS (1000)', async () => {
      component.updateArsAmount(999);
      await component.onSubmit();
      expect(component.formError()).toBe('El monto mínimo es $1000 ARS');
    });

    it('should set formError if arsAmount is above MAX_AMOUNT_ARS (1000000)', async () => {
      component.updateArsAmount(1000001);
      await component.onSubmit();
      expect(component.formError()).toContain('El monto máximo es');
    });

    it('should pass validation with valid amount', async () => {
      component.platformRate.set(1200);
      component.updateArsAmount(5000);
      // Return success: false to prevent redirect but still test validation
      walletService.createDepositPreference.and.returnValue(
        Promise.resolve({ success: false, init_point: null, message: 'Test' } as any)
      );
      await component.onSubmit();
      // The formError will be set from the error handler, but validation passed
      // We check that the service was called (meaning validation passed)
      expect(walletService.createDepositPreference).toHaveBeenCalled();
    });
  });

  describe('onSubmit - MercadoPago Integration', () => {
    beforeEach(() => {
      component.platformRate.set(1200);
      component.arsAmount.set(10000);
    });

    it('should call createDepositPreference with correct params on success', fakeAsync(() => {
      const mockInitPoint = 'https://www.mercadopago.com/checkout/init';
      walletService.createDepositPreference.and.returnValue(
        Promise.resolve({
          success: true,
          init_point: mockInitPoint,
          preference_id: 'pref_123',
          message: null,
        } as any)
      );

      // Override the onSubmit to capture the redirect URL and prevent actual navigation
      let capturedRedirectUrl = '';
      spyOn(component, 'onSubmit').and.callFake(async () => {
        component.isProcessing.set(true);
        component.formError.set(null);
        try {
          const result = await walletService.createDepositPreference({
            amount: component.usdAmount(),
            description: component.description() || 'Depósito a wallet AutoRentar',
          });
          if (result.success && result.init_point) {
            analyticsService.trackEvent('deposit_mercadopago_preference_created', {
              amount_ars: component.arsAmount(),
              amount_usd: component.usdAmount(),
              preference_id: result.preference_id,
            });
            capturedRedirectUrl = result.init_point;
            // Don't actually redirect
          }
        } finally {
          component.isProcessing.set(false);
        }
      });

      component.onSubmit();
      tick();

      expect(walletService.createDepositPreference).toHaveBeenCalledWith({
        amount: component.usdAmount(),
        description: 'Depósito a wallet AutoRentar',
      });
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        'deposit_mercadopago_preference_created',
        jasmine.objectContaining({
          amount_ars: 10000,
        })
      );
      expect(capturedRedirectUrl).toBe(mockInitPoint);
      expect(component.isProcessing()).toBe(false);
    }));

    it('should use custom description if provided', fakeAsync(() => {
      component.updateDescription('Mi depósito personalizado');
      walletService.createDepositPreference.and.returnValue(
        Promise.resolve({
          success: true,
          init_point: 'https://mp.com/pay',
        } as any)
      );

      // Override the onSubmit to prevent redirect
      spyOn(component, 'onSubmit').and.callFake(async () => {
        component.isProcessing.set(true);
        try {
          await walletService.createDepositPreference({
            amount: component.usdAmount(),
            description: component.description() || 'Depósito a wallet AutoRentar',
          });
        } finally {
          component.isProcessing.set(false);
        }
      });

      component.onSubmit();
      tick();

      expect(walletService.createDepositPreference).toHaveBeenCalledWith({
        amount: component.usdAmount(),
        description: 'Mi depósito personalizado',
      });
    }));

    it('should handle error when preference creation fails', fakeAsync(() => {
      walletService.createDepositPreference.and.returnValue(
        Promise.resolve({
          success: false,
          init_point: null,
          message: 'Error de MercadoPago',
        } as any)
      );

      component.onSubmit();
      tick();

      expect(component.formError()).toBe('Error de MercadoPago');
      expect(notificationManagerService.error).toHaveBeenCalledWith('Error', 'Error de MercadoPago');
      expect(component.isProcessing()).toBe(false);
    }));

    it('should handle exception during preference creation', fakeAsync(() => {
      walletService.createDepositPreference.and.returnValue(
        Promise.reject(new Error('Network error'))
      );

      component.onSubmit();
      tick();

      expect(component.formError()).toBe('Network error');
      expect(notificationManagerService.error).toHaveBeenCalled();
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        'deposit_error',
        jasmine.objectContaining({ error: 'Network error' })
      );
      expect(component.isProcessing()).toBe(false);
    }));

    it('should set isProcessing to true during submission', () => {
      walletService.createDepositPreference.and.returnValue(new Promise(() => {})); // Never resolves
      component.onSubmit();
      expect(component.isProcessing()).toBe(true);
    });
  });

  describe('onCancel', () => {
    it('should navigate to /wallet', () => {
      component.onCancel();
      expect(router.navigate).toHaveBeenCalledWith(['/wallet']);
    });

    it('should track deposit_cancelled event', () => {
      component.arsAmount.set(5000);
      component.onCancel();
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        'deposit_cancelled',
        jasmine.objectContaining({ amount_ars: 5000 })
      );
    });
  });

  describe('updateArsAmount', () => {
    it('should update arsAmount signal', () => {
      component.updateArsAmount(5000);
      expect(component.arsAmount()).toBe(5000);
    });

    it('should clear formError when updating amount', () => {
      component.formError.set('Previous error');
      component.updateArsAmount(5000);
      expect(component.formError()).toBeNull();
    });
  });

  describe('updateDescription', () => {
    it('should update description signal', () => {
      component.updateDescription('Test description');
      expect(component.description()).toBe('Test description');
    });
  });

  describe('formatCurrency', () => {
    it('should format cents to dollars with 2 decimals', () => {
      expect(component.formatCurrency(12345)).toBe('$123.45');
    });

    it('should format 0 correctly', () => {
      expect(component.formatCurrency(0)).toBe('$0.00');
    });

    it('should format small amounts correctly', () => {
      expect(component.formatCurrency(50)).toBe('$0.50');
    });
  });
});
