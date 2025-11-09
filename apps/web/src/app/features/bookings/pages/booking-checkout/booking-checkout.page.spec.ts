import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PaymentGatewayFactory } from '../../../../core/services/payment-gateway.factory';
import { BookingsService } from '../../../../core/services/bookings.service';
import { PaymentProvider } from '../../../../core/interfaces/payment-gateway.interface';
import { BookingCheckoutPage } from './booking-checkout.page';
import type {PaymentProvider} from '../types/database.types';

describe('BookingCheckoutPage', () => {
  let component: BookingCheckoutPage;
  let fixture: ComponentFixture<BookingCheckoutPage>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;
  let mockGatewayFactory: jasmine.SpyObj<PaymentGatewayFactory>;
  let mockBookingsService: jasmine.SpyObj<BookingsService>;
  let mockPaymentGateway: any;

  const mockBooking = {
    id: 'booking-123',
    total_price: 50000,
    currency: 'ARS',
    status: 'pending',
    start_date: '2025-11-10',
    end_date: '2025-11-15',
    car: {
      id: 'car-456',
      brand: 'Toyota',
      model: 'Corolla',
    },
  };

  beforeEach(async () => {
    // Create mocks
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('booking-123'),
        },
      },
    };
    mockGatewayFactory = jasmine.createSpyObj('PaymentGatewayFactory', ['createBookingGateway']);
    mockBookingsService = jasmine.createSpyObj('BookingsService', ['getBookingById']);

    // Mock payment gateway
    mockPaymentGateway = {
      createBookingPreference: jasmine.createSpy('createBookingPreference').and.returnValue(
        of({
          success: true,
          preference_id: 'pref-123',
          init_point: 'https://mercadopago.com/checkout/pref-123',
          amount_ars: 50000,
          currency: 'ARS',
          provider: 'mercadopago' as PaymentProvider,
        }),
      ),
      redirectToCheckout: jasmine.createSpy('redirectToCheckout'),
    };

    mockGatewayFactory.createBookingGateway.and.returnValue(mockPaymentGateway);
    mockBookingsService.getBookingById.and.returnValue(Promise.resolve(mockBooking));

    await TestBed.configureTestingModule({
      imports: [BookingCheckoutPage],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: PaymentGatewayFactory, useValue: mockGatewayFactory },
        { provide: BookingsService, useValue: mockBookingsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingCheckoutPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load booking on init', async () => {
      await component.ngOnInit();

      expect(component.bookingId()).toBe('booking-123');
      expect(component.booking()).toEqual(mockBooking);
      expect(component.isLoading()).toBe(false);
    });

    it('should set error if booking ID not found', async () => {
      mockActivatedRoute.snapshot.paramMap.get.and.returnValue(null);

      await component.ngOnInit();

      expect(component.error()).toBe('ID de booking no encontrado');
      expect(component.isLoading()).toBe(false);
    });

    it('should set error if booking not found', async () => {
      mockBookingsService.getBookingById.and.returnValue(Promise.resolve(null));

      await component.ngOnInit();

      expect(component.error()).toContain('Booking no encontrado');
      expect(component.isLoading()).toBe(false);
    });

    it('should set error if booking is not in pending status', async () => {
      mockBookingsService.getBookingById.and.returnValue(
        Promise.resolve({ ...mockBooking, status: 'confirmed' }),
      );

      await component.ngOnInit();

      expect(component.error()).toContain('confirmed');
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('handleProviderChange', () => {
    it('should update signals when provider changes', () => {
      const event = {
        provider: 'paypal' as PaymentProvider,
        amountInProviderCurrency: 50.0,
        providerCurrency: 'USD',
      };

      component.handleProviderChange(event);

      expect(component.selectedProvider()).toBe('paypal');
      expect(component.amountInProviderCurrency()).toBe(50.0);
      expect(component.providerCurrency()).toBe('USD');
    });

    it('should clear MercadoPago preference when provider changes', () => {
      component.mercadoPagoPreferenceId.set('pref-123');
      component.mercadoPagoInitPoint.set('https://mp.com/checkout');

      component.handleProviderChange({
        provider: 'paypal',
        amountInProviderCurrency: 50.0,
        providerCurrency: 'USD',
      });

      expect(component.mercadoPagoPreferenceId()).toBe('');
      expect(component.mercadoPagoInitPoint()).toBe('');
    });
  });

  describe('handleMercadoPagoPayment', () => {
    beforeEach(async () => {
      await component.ngOnInit();
      component.selectedProvider.set('mercadopago');
      component.amountInProviderCurrency.set(50000);
    });

    it('should create preference and redirect to MercadoPago', async () => {
      await component.handleMercadoPagoPayment();

      expect(mockGatewayFactory.createBookingGateway).toHaveBeenCalledWith('mercadopago');
      expect(mockPaymentGateway.createBookingPreference).toHaveBeenCalledWith('booking-123', true);
      expect(mockPaymentGateway.redirectToCheckout).toHaveBeenCalledWith(
        'https://mercadopago.com/checkout/pref-123',
        false,
      );
      expect(component.mercadoPagoPreferenceId()).toBe('pref-123');
    });

    it('should set error if preference creation fails', async () => {
      mockPaymentGateway.createBookingPreference.and.returnValue(
        throwError(() => new Error('Network error')),
      );

      await component.handleMercadoPagoPayment();

      expect(component.error()).toContain('Network error');
      expect(component.isProcessingPayment()).toBe(false);
    });

    it('should not process payment if button is disabled', async () => {
      component.isLoading.set(true);

      await component.handleMercadoPagoPayment();

      expect(mockPaymentGateway.createBookingPreference).not.toHaveBeenCalled();
    });
  });

  describe('handlePayPalApprove', () => {
    beforeEach(async () => {
      await component.ngOnInit();
    });

    it('should navigate to confirmation page with query params', () => {
      const event = {
        orderId: 'ORDER-123',
        captureId: 'CAPTURE-456',
      };

      component.handlePayPalApprove(event);

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/bookings', 'booking-123', 'confirmation'],
        {
          queryParams: {
            provider: 'paypal',
            orderId: 'ORDER-123',
            captureId: 'CAPTURE-456',
          },
        },
      );
    });
  });

  describe('handlePayPalError', () => {
    it('should set error message and stop processing', () => {
      const error = new Error('PayPal declined the payment');

      component.handlePayPalError(error);

      expect(component.error()).toContain('PayPal declined the payment');
      expect(component.isProcessingPayment()).toBe(false);
    });
  });

  describe('cancelPayment', () => {
    beforeEach(async () => {
      await component.ngOnInit();
    });

    it('should navigate back to booking details', () => {
      component.cancelPayment();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/bookings', 'booking-123']);
    });
  });

  describe('computed signals', () => {
    beforeEach(async () => {
      await component.ngOnInit();
    });

    it('isPaymentButtonEnabled should return true when conditions are met', () => {
      component.isLoading.set(false);
      component.isProcessingPayment.set(false);
      component.booking.set(mockBooking);
      component.amountInProviderCurrency.set(50000);

      expect(component.isPaymentButtonEnabled()).toBe(true);
    });

    it('isPaymentButtonEnabled should return false when loading', () => {
      component.isLoading.set(true);
      component.isProcessingPayment.set(false);
      component.booking.set(mockBooking);
      component.amountInProviderCurrency.set(50000);

      expect(component.isPaymentButtonEnabled()).toBe(false);
    });

    it('isPaymentButtonEnabled should return false when processing', () => {
      component.isLoading.set(false);
      component.isProcessingPayment.set(true);
      component.booking.set(mockBooking);
      component.amountInProviderCurrency.set(50000);

      expect(component.isPaymentButtonEnabled()).toBe(false);
    });

    it('isMercadoPago should return true when provider is mercadopago', () => {
      component.selectedProvider.set('mercadopago');

      expect(component.isMercadoPago()).toBe(true);
      expect(component.isPayPal()).toBe(false);
    });

    it('isPayPal should return true when provider is paypal', () => {
      component.selectedProvider.set('paypal');

      expect(component.isPayPal()).toBe(true);
      expect(component.isMercadoPago()).toBe(false);
    });
  });

  describe('formatCurrency', () => {
    it('should format ARS currency correctly', () => {
      const result = component.formatCurrency(50000, 'ARS');

      expect(result).toContain('50.000');
      expect(result).toContain('ARS');
    });

    it('should format USD currency correctly', () => {
      const result = component.formatCurrency(50.5, 'USD');

      expect(result).toContain('50.50');
      expect(result).toContain('USD');
    });
  });
});
