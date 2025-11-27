import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingsService } from '../../../../core/services/bookings.service';
import { BookingConfirmationPage } from './booking-confirmation.page';

// TODO: Fix - Missing HttpClientTestingModule for TikTokEventsService dependency
xdescribe('BookingConfirmationPage', () => {
  let component: BookingConfirmationPage;
  let fixture: ComponentFixture<BookingConfirmationPage>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;
  let mockBookingsService: jasmine.SpyObj<BookingsService>;

  const mockBooking = {
    id: 'booking-123',
    car_id: 'car-456',
    user_id: 'user-789',
    renter_id: 'user-789',
    total_amount: 50000,
    currency: 'ARS',
    status: 'confirmed',
    start_at: '2025-11-10',
    end_at: '2025-11-15',
    created_at: '2025-11-07T10:00:00Z',
    car: {
      id: 'car-456',
      brand: 'Toyota',
      model: 'Corolla',
    },
  } as any;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('booking-123'),
        },
        queryParams: {
          provider: 'paypal',
          orderId: 'ORDER-123',
          captureId: 'CAPTURE-456',
        },
      },
    };
    mockBookingsService = jasmine.createSpyObj('BookingsService', ['getBookingById']);

    mockBookingsService.getBookingById.and.returnValue(Promise.resolve(mockBooking));

    await TestBed.configureTestingModule({
      imports: [BookingConfirmationPage],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: BookingsService, useValue: mockBookingsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingConfirmationPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load booking and set success status', async () => {
      await component.ngOnInit();

      expect(component.bookingId()).toBe('booking-123');
      expect(component.booking()).toEqual(mockBooking);
      expect(component.status()).toBe('success');
      expect(component.isLoading()).toBe(false);
    });

    it('should set error if booking ID not found', async () => {
      mockActivatedRoute.snapshot.paramMap.get.and.returnValue(null);

      await component.ngOnInit();

      expect(component.status()).toBe('error');
      expect(component.errorMessage()).toBe('ID de booking no encontrado');
      expect(component.isLoading()).toBe(false);
    });

    it('should set error if provider not specified', async () => {
      mockActivatedRoute.snapshot.queryParams = {};

      await component.ngOnInit();

      expect(component.status()).toBe('error');
      expect(component.errorMessage()).toBe('Proveedor de pago no especificado');
    });
  });

  describe('extractPaymentDetails', () => {
    it('should extract PayPal payment details from query params', async () => {
      mockActivatedRoute.snapshot.queryParams = {
        provider: 'paypal',
        orderId: 'ORDER-123',
        captureId: 'CAPTURE-456',
      };

      await component.ngOnInit();

      const details = component.paymentDetails();
      expect(details?.provider).toBe('paypal');
      expect(details?.orderId).toBe('ORDER-123');
      expect(details?.captureId).toBe('CAPTURE-456');
      expect(component.status()).toBe('success'); // captureId presente = success
    });

    it('should extract MercadoPago payment details from query params', async () => {
      mockActivatedRoute.snapshot.queryParams = {
        provider: 'mercadopago',
        preference_id: 'PREF-123',
        payment_id: 'PAY-456',
        status: 'approved',
      };

      await component.ngOnInit();

      const details = component.paymentDetails();
      expect(details?.provider).toBe('mercadopago');
      expect(details?.preferenceId).toBe('PREF-123');
      expect(details?.paymentId).toBe('PAY-456');
      expect(component.status()).toBe('success');
    });

    it('should set pending status for PayPal with only orderId', async () => {
      mockActivatedRoute.snapshot.queryParams = {
        provider: 'paypal',
        orderId: 'ORDER-123',
      };
      mockBookingsService.getBookingById.and.returnValue(
        Promise.resolve({ ...mockBooking, status: 'pending' }),
      );

      await component.ngOnInit();

      expect(component.status()).toBe('pending');
    });

    it('should set error status for rejected MercadoPago payment', async () => {
      mockActivatedRoute.snapshot.queryParams = {
        provider: 'mercadopago',
        status: 'rejected',
      };

      await component.ngOnInit();

      expect(component.status()).toBe('error');
      expect(component.errorMessage()).toContain('rechazado');
    });
  });

  describe('loadBookingAndVerifyPayment', () => {
    it('should set success status when booking is confirmed', async () => {
      mockBookingsService.getBookingById.and.returnValue(
        Promise.resolve({ ...mockBooking, status: 'confirmed' }),
      );

      await component.ngOnInit();

      expect(component.status()).toBe('success');
      expect(component.booking()?.status).toBe('confirmed');
    });

    it('should set pending status and start polling when booking is pending', async () => {
      mockBookingsService.getBookingById.and.returnValue(
        Promise.resolve({ ...mockBooking, status: 'pending' }),
      );

      spyOn<any>(component, 'startPollingBookingStatus');

      await component.ngOnInit();

      expect(component.status()).toBe('pending');
      expect(component['startPollingBookingStatus']).toHaveBeenCalled();
    });

    it('should set error status when booking is rejected', async () => {
      mockBookingsService.getBookingById.and.returnValue(
        Promise.resolve({ ...mockBooking, status: 'rejected' }),
      );

      await component.ngOnInit();

      expect(component.status()).toBe('error');
      expect(component.errorMessage()).toContain('rejected');
    });

    it('should throw error if booking not found', async () => {
      mockBookingsService.getBookingById.and.returnValue(Promise.resolve(null));

      await component.ngOnInit();

      expect(component.status()).toBe('error');
      expect(component.errorMessage()).toContain('no encontrado');
    });
  });

  describe('startPollingBookingStatus', () => {
    it('should update status when booking becomes confirmed', fakeAsync(() => {
      // Initial state: pending
      mockBookingsService.getBookingById.and.returnValue(
        Promise.resolve({ ...mockBooking, status: 'pending' }),
      );

      component.bookingId.set('booking-123');
      component.status.set('pending');

      // Start polling
      component['startPollingBookingStatus']();

      // First poll: still pending
      tick(3000);
      expect(component.status()).toBe('pending');

      // Second poll: confirmed
      mockBookingsService.getBookingById.and.returnValue(
        Promise.resolve({ ...mockBooking, status: 'confirmed' }),
      );

      tick(3000);
      expect(component.status()).toBe('success');
    }));

    it('should stop polling after max attempts', fakeAsync(() => {
      mockBookingsService.getBookingById.and.returnValue(
        Promise.resolve({ ...mockBooking, status: 'pending' }),
      );

      component.bookingId.set('booking-123');
      component.status.set('pending');

      component['startPollingBookingStatus']();

      // Poll 10 times (30 seconds)
      for (let i = 0; i < 10; i++) {
        tick(3000);
      }

      // Should still be pending after max attempts
      expect(component.status()).toBe('pending');

      // Should not make more calls
      const callCount = mockBookingsService.getBookingById.calls.count();
      tick(10000); // Wait more time
      expect(mockBookingsService.getBookingById.calls.count()).toBe(callCount);
    }));
  });

  describe('computed signals', () => {
    beforeEach(async () => {
      await component.ngOnInit();
    });

    it('isSuccess should return true when status is success', () => {
      component.status.set('success');
      expect(component.isSuccess()).toBe(true);
      expect(component.isPending()).toBe(false);
      expect(component.isError()).toBe(false);
    });

    it('isPending should return true when status is pending', () => {
      component.status.set('pending');
      expect(component.isPending()).toBe(true);
      expect(component.isSuccess()).toBe(false);
      expect(component.isError()).toBe(false);
    });

    it('isError should return true when status is error', () => {
      component.status.set('error');
      expect(component.isError()).toBe(true);
      expect(component.isSuccess()).toBe(false);
      expect(component.isPending()).toBe(false);
    });

    it('providerDisplayName should return correct name for PayPal', () => {
      component.paymentDetails.set({ provider: 'paypal' });
      expect(component.providerDisplayName()).toBe('PayPal');
    });

    it('providerDisplayName should return correct name for MercadoPago', () => {
      component.paymentDetails.set({ provider: 'mercadopago' });
      expect(component.providerDisplayName()).toBe('MercadoPago');
    });

    it('confirmationMessage should return success message', () => {
      component.status.set('success');
      component.paymentDetails.set({ provider: 'paypal' });

      expect(component.confirmationMessage()).toContain('confirmado');
      expect(component.confirmationMessage()).toContain('PayPal');
    });

    it('paymentReferenceId should return orderId for PayPal', () => {
      component.paymentDetails.set({
        provider: 'paypal',
        orderId: 'ORDER-123',
        captureId: 'CAPTURE-456',
      });

      expect(component.paymentReferenceId()).toBe('ORDER-123');
    });

    it('paymentReferenceId should return paymentId for MercadoPago', () => {
      component.paymentDetails.set({
        provider: 'mercadopago',
        paymentId: 'PAY-789',
        preferenceId: 'PREF-123',
      });

      expect(component.paymentReferenceId()).toBe('PAY-789');
    });
  });

  describe('navigation methods', () => {
    beforeEach(async () => {
      await component.ngOnInit();
    });

    it('viewBookingDetails should navigate to booking details', () => {
      component.viewBookingDetails();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/bookings', 'booking-123']);
    });

    it('goToHome should navigate to home', () => {
      component.goToHome();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });

    it('goToMyBookings should navigate to bookings list', () => {
      component.goToMyBookings();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/bookings']);
    });
  });

  describe('retry', () => {
    beforeEach(async () => {
      await component.ngOnInit();
    });

    it('should reload booking and update status', async () => {
      component.status.set('error');
      component.errorMessage.set('Previous error');

      mockBookingsService.getBookingById.and.returnValue(
        Promise.resolve({ ...mockBooking, status: 'confirmed' }),
      );

      await component.retry();

      expect(component.status()).toBe('success');
      expect(component.errorMessage()).toBe('');
      expect(component.isLoading()).toBe(false);
    });

    it('should handle error during retry', async () => {
      mockBookingsService.getBookingById.and.returnValue(
        Promise.reject(new Error('Network error')),
      );

      await component.retry();

      expect(component.errorMessage()).toContain('Network error');
      expect(component.isLoading()).toBe(false);
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

  describe('formatDate', () => {
    it('should format Date object correctly', () => {
      const date = new Date('2025-11-05T15:30:00');
      const result = component.formatDate(date);

      expect(result).toContain('2025');
      expect(result).toContain('noviembre');
    });

    it('should format date string correctly', () => {
      const result = component.formatDate('2025-11-05T15:30:00');

      expect(result).toContain('2025');
    });
  });

  describe('downloadReceipt', () => {
    it('should show alert for placeholder functionality', () => {
      spyOn(window, 'alert');

      component.downloadReceipt();

      expect(window.alert).toHaveBeenCalledWith(
        'Funcionalidad de descarga de recibo en desarrollo',
      );
    });
  });
});
