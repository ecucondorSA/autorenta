import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PaymentOrchestrationService, BookingPaymentParams, PaymentResult, RefundParams } from './payment-orchestration.service';
import { PaymentsService } from './payments.service';
import { PaymentAuthorizationService } from './payment-authorization.service';
import { SplitPaymentService } from './split-payment.service';
import { BookingsService } from './bookings.service';
import { WalletService } from './wallet.service';
import { LoggerService } from './logger.service';

describe('PaymentOrchestrationService', () => {
  let service: PaymentOrchestrationService;
  let paymentsService: jasmine.SpyObj<PaymentsService>;
  let authService: jasmine.SpyObj<PaymentAuthorizationService>;
  let splitService: jasmine.SpyObj<SplitPaymentService>;
  let bookingsService: jasmine.SpyObj<BookingsService>;
  let walletService: jasmine.SpyObj<WalletService>;
  let loggerService: jasmine.SpyObj<LoggerService>;

  // Test Data
  const mockBooking = {
    id: 'booking-123',
    car_id: 'car-456',
    user_id: 'user-789',
    status: 'pending',
    total_price_cents: 50000,
    payment_method: null,
  };

  const mockPaymentIntent = {
    id: 'intent-123',
    status: 'pending',
    amount: 500,
  };

  beforeEach(() => {
    // Create spies for all dependencies
    const paymentsServiceSpy = jasmine.createSpyObj('PaymentsService', [
      'createIntent',
      'getStatus',
    ]);
    const authServiceSpy = jasmine.createSpyObj('PaymentAuthorizationService', [
      'authorizePayment',
    ]);
    const splitServiceSpy = jasmine.createSpyObj('SplitPaymentService', [
      'processSplitPayment',
    ]);
    const bookingsServiceSpy = jasmine.createSpyObj('BookingsService', [
      'getBookingById',
      'updateBooking',
    ]);
    const walletServiceSpy = jasmine.createSpyObj('WalletService', [
      'lockFunds',
      'unlockFunds',
      'getBalance',
    ]);
    const loggerServiceSpy = jasmine.createSpyObj('LoggerService', [
      'info',
      'error',
      'warn',
    ]);

    TestBed.configureTestingModule({
      providers: [
        PaymentOrchestrationService,
        { provide: PaymentsService, useValue: paymentsServiceSpy },
        { provide: PaymentAuthorizationService, useValue: authServiceSpy },
        { provide: SplitPaymentService, useValue: splitServiceSpy },
        { provide: BookingsService, useValue: bookingsServiceSpy },
        { provide: WalletService, useValue: walletServiceSpy },
        { provide: LoggerService, useValue: loggerServiceSpy },
      ],
    });

    service = TestBed.inject(PaymentOrchestrationService);
    paymentsService = TestBed.inject(PaymentsService) as jasmine.SpyObj<PaymentsService>;
    authService = TestBed.inject(PaymentAuthorizationService) as jasmine.SpyObj<PaymentAuthorizationService>;
    splitService = TestBed.inject(SplitPaymentService) as jasmine.SpyObj<SplitPaymentService>;
    bookingsService = TestBed.inject(BookingsService) as jasmine.SpyObj<BookingsService>;
    walletService = TestBed.inject(WalletService) as jasmine.SpyObj<WalletService>;
    loggerService = TestBed.inject(LoggerService) as jasmine.SpyObj<LoggerService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ============================================================================
  // WALLET PAYMENT TESTS
  // ============================================================================

  describe('processWalletPayment', () => {
    it('should process wallet payment successfully', (done) => {
      // Arrange
      const params: BookingPaymentParams = {
        bookingId: 'booking-123',
        method: 'wallet',
        totalAmount: 500,
        currency: 'ARS',
      };

      bookingsService.getBookingById.and.returnValue(Promise.resolve(mockBooking));
      walletService.lockFunds.and.returnValue(of({ success: true }));
      bookingsService.updateBooking.and.returnValue(Promise.resolve({ ...mockBooking, status: 'confirmed' }));
      paymentsService.createIntent.and.returnValue(Promise.resolve(mockPaymentIntent));

      // Act
      service.processBookingPayment(params).subscribe({
        next: (result: PaymentResult) => {
          // Assert
          expect(result.success).toBe(true);
          expect(result.bookingId).toBe('booking-123');
          expect(result.paymentIntentId).toBe('intent-123');
          expect(result.message).toContain('wallet');

          expect(walletService.lockFunds).toHaveBeenCalledWith(
            'booking-123',
            500,
            jasmine.stringContaining('booking-123'),
          );
          expect(bookingsService.updateBooking).toHaveBeenCalledWith(
            'booking-123',
            jasmine.objectContaining({ status: 'confirmed', payment_method: 'wallet' }),
          );
          expect(paymentsService.createIntent).toHaveBeenCalledWith('booking-123');

          done();
        },
        error: done.fail,
      });
    });

    it('should handle wallet payment failure when booking not found', (done) => {
      // Arrange
      const params: BookingPaymentParams = {
        bookingId: 'nonexistent-booking',
        method: 'wallet',
        totalAmount: 500,
        currency: 'ARS',
      };

      bookingsService.getBookingById.and.returnValue(Promise.resolve(null));

      // Act
      service.processBookingPayment(params).subscribe({
        next: (result: PaymentResult) => {
          // Assert
          expect(result.success).toBe(false);
          expect(result.error).toContain('not found');
          expect(walletService.lockFunds).not.toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('should handle wallet payment failure when insufficient funds', (done) => {
      // Arrange
      const params: BookingPaymentParams = {
        bookingId: 'booking-123',
        method: 'wallet',
        totalAmount: 500,
        currency: 'ARS',
      };

      bookingsService.getBookingById.and.returnValue(Promise.resolve(mockBooking));
      walletService.lockFunds.and.returnValue(throwError(() => new Error('Insufficient funds')));

      // Act
      service.processBookingPayment(params).subscribe({
        next: (result: PaymentResult) => {
          // Assert
          expect(result.success).toBe(false);
          expect(result.error).toContain('Insufficient funds');
          expect(loggerService.error).toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });
  });

  // ============================================================================
  // CREDIT CARD PAYMENT TESTS
  // ============================================================================

  describe('processCreditCardPayment', () => {
    it('should initiate credit card payment successfully', (done) => {
      // Arrange
      const params: BookingPaymentParams = {
        bookingId: 'booking-123',
        method: 'credit_card',
        totalAmount: 500,
        currency: 'ARS',
      };

      paymentsService.createIntent.and.returnValue(Promise.resolve(mockPaymentIntent));
      bookingsService.updateBooking.and.returnValue(Promise.resolve({
        ...mockBooking,
        status: 'pending_payment',
      }));

      // Act
      service.processBookingPayment(params).subscribe({
        next: (result: PaymentResult) => {
          // Assert
          expect(result.success).toBe(true);
          expect(result.paymentIntentId).toBe('intent-123');
          expect(result.mercadoPagoInitPoint).toBeDefined();
          expect(result.message).toContain('Redirecting');

          expect(paymentsService.createIntent).toHaveBeenCalledWith('booking-123');
          expect(bookingsService.updateBooking).toHaveBeenCalledWith(
            'booking-123',
            jasmine.objectContaining({ status: 'pending_payment', payment_method: 'credit_card' }),
          );

          done();
        },
        error: done.fail,
      });
    });

    it('should handle credit card payment failure', (done) => {
      // Arrange
      const params: BookingPaymentParams = {
        bookingId: 'booking-123',
        method: 'credit_card',
        totalAmount: 500,
        currency: 'ARS',
      };

      paymentsService.createIntent.and.returnValue(Promise.reject(new Error('MercadoPago error')));

      // Act
      service.processBookingPayment(params).subscribe({
        next: (result: PaymentResult) => {
          // Assert
          expect(result.success).toBe(false);
          expect(result.error).toContain('MercadoPago error');
          expect(loggerService.error).toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });
  });

  // ============================================================================
  // PARTIAL WALLET PAYMENT TESTS
  // ============================================================================

  describe('processPartialWalletPayment', () => {
    it('should process partial wallet payment successfully', (done) => {
      // Arrange
      const params: BookingPaymentParams = {
        bookingId: 'booking-123',
        method: 'partial_wallet',
        totalAmount: 500,
        currency: 'ARS',
        walletAmount: 300,
        cardAmount: 200,
      };

      walletService.lockFunds.and.returnValue(of({ success: true }));
      paymentsService.createIntent.and.returnValue(Promise.resolve(mockPaymentIntent));
      bookingsService.updateBooking.and.returnValue(Promise.resolve({
        ...mockBooking,
        status: 'pending_payment',
      }));

      // Act
      service.processBookingPayment(params).subscribe({
        next: (result: PaymentResult) => {
          // Assert
          expect(result.success).toBe(true);
          expect(result.paymentIntentId).toBe('intent-123');
          expect(result.message).toContain('Wallet funds locked');

          expect(walletService.lockFunds).toHaveBeenCalledWith(
            'booking-123',
            300,
            jasmine.stringContaining('Partial payment'),
          );
          expect(bookingsService.updateBooking).toHaveBeenCalledWith(
            'booking-123',
            jasmine.objectContaining({
              status: 'pending_payment',
              payment_method: 'partial_wallet',
              wallet_amount_cents: 30000,
            }),
          );

          done();
        },
        error: done.fail,
      });
    });

    it('should reject partial wallet payment without amounts', (done) => {
      // Arrange
      const params: BookingPaymentParams = {
        bookingId: 'booking-123',
        method: 'partial_wallet',
        totalAmount: 500,
        currency: 'ARS',
        // Missing walletAmount and cardAmount
      };

      // Act
      service.processBookingPayment(params).subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (error: Error) => {
          // Assert
          expect(error.message).toContain('Wallet and card amounts required');
          done();
        },
      });
    });

    it('should unlock wallet funds on partial payment failure', (done) => {
      // Arrange
      const params: BookingPaymentParams = {
        bookingId: 'booking-123',
        method: 'partial_wallet',
        totalAmount: 500,
        currency: 'ARS',
        walletAmount: 300,
        cardAmount: 200,
      };

      walletService.lockFunds.and.returnValue(of({ success: true }));
      paymentsService.createIntent.and.returnValue(Promise.reject(new Error('Payment failed')));
      walletService.unlockFunds.and.returnValue(of({ success: true }));

      // Act
      service.processBookingPayment(params).subscribe({
        next: (result: PaymentResult) => {
          // Assert
          expect(result.success).toBe(false);
          expect(walletService.unlockFunds).toHaveBeenCalledWith(
            'booking-123',
            jasmine.stringContaining('Payment failed'),
          );
          done();
        },
        error: done.fail,
      });
    });
  });

  // ============================================================================
  // WEBHOOK HANDLING TESTS
  // ============================================================================

  describe('handlePaymentWebhook', () => {
    it('should handle approved payment webhook', async () => {
      // Arrange
      const payload = {
        booking_id: 'booking-123',
        status: 'approved',
        payment_id: 'payment-456',
      };

      paymentsService.getStatus.and.returnValue(Promise.resolve({ status: 'approved' }));
      bookingsService.updateBooking.and.returnValue(Promise.resolve({
        ...mockBooking,
        status: 'confirmed',
      }));

      // Act
      await service.handlePaymentWebhook(payload);

      // Assert
      expect(paymentsService.getStatus).toHaveBeenCalledWith('payment-456');
      expect(bookingsService.updateBooking).toHaveBeenCalledWith(
        'booking-123',
        jasmine.objectContaining({ status: 'confirmed' }),
      );
      expect(loggerService.info).toHaveBeenCalledWith(
        jasmine.stringContaining('Webhook processed successfully'),
        jasmine.any(String),
      );
    });

    it('should handle rejected payment webhook and unlock funds', async () => {
      // Arrange
      const payload = {
        booking_id: 'booking-123',
        status: 'rejected',
        payment_id: 'payment-456',
      };

      paymentsService.getStatus.and.returnValue(Promise.resolve({ status: 'rejected' }));
      bookingsService.updateBooking.and.returnValue(Promise.resolve({
        ...mockBooking,
        status: 'cancelled',
      }));
      walletService.unlockFunds.and.returnValue(of({ success: true }));

      // Act
      await service.handlePaymentWebhook(payload);

      // Assert
      expect(bookingsService.updateBooking).toHaveBeenCalledWith(
        'booking-123',
        jasmine.objectContaining({ status: 'cancelled' }),
      );
      expect(walletService.unlockFunds).toHaveBeenCalledWith(
        'booking-123',
        jasmine.stringContaining('Payment failed'),
      );
    });

    it('should reject invalid webhook payload', async () => {
      // Arrange
      const invalidPayload = {
        // Missing booking_id
        status: 'approved',
      };

      // Act & Assert
      await expectAsync(service.handlePaymentWebhook(invalidPayload)).toBeRejectedWithError(/Missing booking_id/);
      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should handle non-object webhook payload', async () => {
      // Arrange
      const invalidPayload = 'not-an-object';

      // Act & Assert
      await expectAsync(service.handlePaymentWebhook(invalidPayload)).toBeRejectedWithError(/Invalid webhook payload/);
    });
  });

  // ============================================================================
  // REFUND PROCESSING TESTS
  // ============================================================================

  describe('processRefund', () => {
    it('should process full refund for wallet payment', (done) => {
      // Arrange
      const params: RefundParams = {
        bookingId: 'booking-123',
        amount: 500,
        reason: 'Customer request',
        refundType: 'full',
      };

      const walletBooking = { ...mockBooking, payment_method: 'wallet' };
      bookingsService.getBookingById.and.returnValue(Promise.resolve(walletBooking));
      walletService.unlockFunds.and.returnValue(of({ success: true }));

      // Act
      service.processRefund(params).subscribe({
        next: (result) => {
          // Assert
          expect(result.success).toBe(true);
          expect(result.amount).toBe(500);
          expect(result.message).toContain('unlocked');

          expect(walletService.unlockFunds).toHaveBeenCalledWith(
            'booking-123',
            jasmine.stringContaining('Refund'),
          );

          done();
        },
        error: done.fail,
      });
    });

    it('should process partial refund with 50% amount', (done) => {
      // Arrange
      const params: RefundParams = {
        bookingId: 'booking-123',
        amount: 500,
        reason: 'Late cancellation',
        refundType: 'partial',
      };

      const walletBooking = { ...mockBooking, payment_method: 'wallet' };
      bookingsService.getBookingById.and.returnValue(Promise.resolve(walletBooking));
      walletService.unlockFunds.and.returnValue(of({ success: true }));

      // Act
      service.processRefund(params).subscribe({
        next: (result) => {
          // Assert
          expect(result.success).toBe(true);
          expect(result.amount).toBe(250); // 50% of 500
          done();
        },
        error: done.fail,
      });
    });

    it('should handle refund for credit card payment', (done) => {
      // Arrange
      const params: RefundParams = {
        bookingId: 'booking-123',
        amount: 500,
        reason: 'Customer request',
        refundType: 'full',
      };

      const cardBooking = { ...mockBooking, payment_method: 'credit_card' };
      bookingsService.getBookingById.and.returnValue(Promise.resolve(cardBooking));

      // Act
      service.processRefund(params).subscribe({
        next: (result) => {
          // Assert
          expect(result.success).toBe(true);
          expect(result.message).toContain('payment provider');
          expect(walletService.unlockFunds).not.toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('should handle refund failure when booking not found', (done) => {
      // Arrange
      const params: RefundParams = {
        bookingId: 'nonexistent-booking',
        amount: 500,
        reason: 'Test',
        refundType: 'full',
      };

      bookingsService.getBookingById.and.returnValue(Promise.resolve(null));

      // Act
      service.processRefund(params).subscribe({
        next: (result) => {
          // Assert
          expect(result.success).toBe(false);
          expect(result.error).toContain('not found');
          expect(loggerService.error).toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });
  });

  // ============================================================================
  // PAYMENT METHOD ROUTING TESTS
  // ============================================================================

  describe('processBookingPayment - method routing', () => {
    it('should route to wallet payment for wallet method', (done) => {
      // Arrange
      const params: BookingPaymentParams = {
        bookingId: 'booking-123',
        method: 'wallet',
        totalAmount: 500,
        currency: 'ARS',
      };

      bookingsService.getBookingById.and.returnValue(Promise.resolve(mockBooking));
      walletService.lockFunds.and.returnValue(of({ success: true }));
      bookingsService.updateBooking.and.returnValue(Promise.resolve(mockBooking));
      paymentsService.createIntent.and.returnValue(Promise.resolve(mockPaymentIntent));

      // Act
      service.processBookingPayment(params).subscribe({
        next: () => {
          expect(walletService.lockFunds).toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('should reject unknown payment method', (done) => {
      // Arrange
      const params = {
        bookingId: 'booking-123',
        method: 'bitcoin' as any, // Invalid method
        totalAmount: 500,
        currency: 'ARS',
      };

      // Act
      service.processBookingPayment(params).subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (error: Error) => {
          expect(error.message).toContain('Unknown payment method');
          done();
        },
      });
    });
  });

  // ============================================================================
  // ANALYTICS TESTS
  // ============================================================================

  describe('getPaymentMethodStats', () => {
    it('should return payment method statistics', async () => {
      // Act
      const stats = await service.getPaymentMethodStats();

      // Assert
      expect(stats).toEqual({
        wallet: 0,
        creditCard: 0,
        partialWallet: 0,
      });
    });
  });
});
