import { TestBed } from '@angular/core/testing';
import { RefundService, ProcessRefundRequest, ProcessRefundResponse } from './refund.service';
import { SupabaseClientService } from './supabase-client.service';
import { AuthService } from './auth.service';
import { LoggerService } from './logger.service';

describe('RefundService', () => {
  let service: RefundService;
  let supabaseClient: jasmine.SpyObj<any>;
  let supabaseService: jasmine.SpyObj<SupabaseClientService>;
  let authService: jasmine.SpyObj<AuthService>;
  let loggerService: jasmine.SpyObj<LoggerService>;

  // Test Data
  const mockSession = {
    access_token: 'mock-access-token',
    user: { id: 'user-123' },
  };

  const mockRefundResponse: ProcessRefundResponse = {
    success: true,
    refund: {
      id: 'refund-123',
      amount: 5000,
      type: 'full',
      status: 'approved',
      date_created: '2025-11-15T10:00:00Z',
    },
    booking_id: 'booking-456',
    payment_id: 'payment-789',
  };

  const mockBooking = {
    id: 'booking-456',
    metadata: {
      refund: {
        id: 'refund-123',
        amount: 5000,
        status: 'approved',
        date_created: '2025-11-15T10:00:00Z',
      },
    },
  };

  beforeEach(() => {
    // Create Supabase client mock
    supabaseClient = {
      functions: {
        invoke: jasmine.createSpy('invoke').and.returnValue(
          Promise.resolve({ data: mockRefundResponse, error: null }),
        ),
      },
      from: jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            single: jasmine.createSpy('single').and.returnValue(
              Promise.resolve({ data: mockBooking, error: null }),
            ),
          }),
        }),
      }),
    };

    const supabaseServiceSpy = jasmine.createSpyObj('SupabaseClientService', ['getClient']);
    supabaseServiceSpy.getClient.and.returnValue(supabaseClient);

    const authServiceSpy = jasmine.createSpyObj('AuthService', ['ensureSession']);
    authServiceSpy.ensureSession.and.returnValue(Promise.resolve(mockSession));

    const loggerServiceSpy = jasmine.createSpyObj('LoggerService', ['info', 'error', 'warn']);

    TestBed.configureTestingModule({
      providers: [
        RefundService,
        { provide: SupabaseClientService, useValue: supabaseServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: LoggerService, useValue: loggerServiceSpy },
      ],
    });

    service = TestBed.inject(RefundService);
    supabaseService = TestBed.inject(SupabaseClientService) as jasmine.SpyObj<SupabaseClientService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    loggerService = TestBed.inject(LoggerService) as jasmine.SpyObj<LoggerService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ============================================================================
  // FULL REFUND TESTS
  // ============================================================================

  describe('processRefund - Full Refund', () => {
    it('should process full refund successfully', async () => {
      // Arrange
      const request: ProcessRefundRequest = {
        booking_id: 'booking-456',
        refund_type: 'full',
        reason: 'Customer request',
      };

      // Act
      const result = await service.processRefund(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.refund.type).toBe('full');
      expect(result.booking_id).toBe('booking-456');
      expect(result.payment_id).toBe('payment-789');

      expect(authService.ensureSession).toHaveBeenCalled();
      expect(supabaseClient.functions.invoke).toHaveBeenCalledWith(
        'mercadopago-process-refund',
        jasmine.objectContaining({
          body: request,
          headers: { Authorization: 'Bearer mock-access-token' },
        }),
      );
      expect(loggerService.info).toHaveBeenCalledWith(
        jasmine.stringContaining('Refund processed successfully'),
        'RefundService',
      );
    });

    it('should handle full refund for large amount (10,000 ARS)', async () => {
      // Arrange
      const request: ProcessRefundRequest = {
        booking_id: 'booking-456',
        refund_type: 'full',
        reason: 'Service cancelled',
      };

      const largeRefundResponse = {
        ...mockRefundResponse,
        refund: {
          ...mockRefundResponse.refund,
          amount: 10000,
        },
      };

      supabaseClient.functions.invoke.and.returnValue(
        Promise.resolve({ data: largeRefundResponse, error: null }),
      );

      // Act
      const result = await service.processRefund(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.refund.amount).toBe(10000);
    });
  });

  // ============================================================================
  // PARTIAL REFUND TESTS
  // ============================================================================

  describe('processRefund - Partial Refund', () => {
    it('should process partial refund with specified amount', async () => {
      // Arrange
      const request: ProcessRefundRequest = {
        booking_id: 'booking-456',
        refund_type: 'partial',
        amount: 2500,
        reason: 'Partial cancellation - 50%',
      };

      const partialRefundResponse: ProcessRefundResponse = {
        success: true,
        refund: {
          id: 'refund-partial-123',
          amount: 2500,
          type: 'partial',
          status: 'approved',
          date_created: '2025-11-15T10:00:00Z',
        },
        booking_id: 'booking-456',
        payment_id: 'payment-789',
      };

      supabaseClient.functions.invoke.and.returnValue(
        Promise.resolve({ data: partialRefundResponse, error: null }),
      );

      // Act
      const result = await service.processRefund(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.refund.type).toBe('partial');
      expect(result.refund.amount).toBe(2500);
      expect(loggerService.info).toHaveBeenCalled();
    });

    it('should validate amount is required for partial refunds', async () => {
      // Arrange
      const request: ProcessRefundRequest = {
        booking_id: 'booking-456',
        refund_type: 'partial',
        // Missing amount
        reason: 'Partial cancellation',
      };

      // Act & Assert
      await expectAsync(service.processRefund(request)).toBeRejectedWithError(
        /amount is required for partial refunds/,
      );
      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should validate amount is greater than 0 for partial refunds', async () => {
      // Arrange
      const request: ProcessRefundRequest = {
        booking_id: 'booking-456',
        refund_type: 'partial',
        amount: 0, // Invalid amount
        reason: 'Test',
      };

      // Act & Assert
      await expectAsync(service.processRefund(request)).toBeRejectedWithError(
        /amount is required for partial refunds and must be greater than 0/,
      );
    });

    it('should validate negative amounts are rejected', async () => {
      // Arrange
      const request: ProcessRefundRequest = {
        booking_id: 'booking-456',
        refund_type: 'partial',
        amount: -100, // Negative amount
        reason: 'Test',
      };

      // Act & Assert
      await expectAsync(service.processRefund(request)).toBeRejectedWithError(
        /amount is required for partial refunds and must be greater than 0/,
      );
    });
  });

  // ============================================================================
  // VALIDATION TESTS
  // ============================================================================

  describe('processRefund - Validation', () => {
    it('should reject refund without booking_id', async () => {
      // Arrange
      const request: ProcessRefundRequest = {
        booking_id: '', // Empty booking ID
        refund_type: 'full',
        reason: 'Test',
      };

      // Act & Assert
      await expectAsync(service.processRefund(request)).toBeRejectedWithError(/booking_id is required/);
      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should reject refund with invalid refund_type', async () => {
      // Arrange
      const request: ProcessRefundRequest = {
        booking_id: 'booking-456',
        refund_type: 'invalid' as any,
        reason: 'Test',
      };

      // Act & Assert
      await expectAsync(service.processRefund(request)).toBeRejectedWithError(
        /refund_type must be "full" or "partial"/,
      );
    });

    it('should reject refund without refund_type', async () => {
      // Arrange
      const request: ProcessRefundRequest = {
        booking_id: 'booking-456',
        refund_type: null as any,
        reason: 'Test',
      };

      // Act & Assert
      await expectAsync(service.processRefund(request)).toBeRejectedWithError(
        /refund_type must be "full" or "partial"/,
      );
    });
  });

  // ============================================================================
  // AUTHENTICATION TESTS
  // ============================================================================

  describe('processRefund - Authentication', () => {
    it('should require authentication', async () => {
      // Arrange
      authService.ensureSession.and.returnValue(Promise.resolve(null));

      const request: ProcessRefundRequest = {
        booking_id: 'booking-456',
        refund_type: 'full',
        reason: 'Test',
      };

      // Act & Assert
      await expectAsync(service.processRefund(request)).toBeRejectedWithError(/Not authenticated/);
      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should require valid access token', async () => {
      // Arrange
      authService.ensureSession.and.returnValue(
        Promise.resolve({ access_token: null, user: { id: 'user-123' } }),
      );

      const request: ProcessRefundRequest = {
        booking_id: 'booking-456',
        refund_type: 'full',
        reason: 'Test',
      };

      // Act & Assert
      await expectAsync(service.processRefund(request)).toBeRejectedWithError(/Not authenticated/);
    });
  });

  // ============================================================================
  // EDGE FUNCTION ERROR HANDLING TESTS
  // ============================================================================

  describe('processRefund - Error Handling', () => {
    it('should handle Edge Function errors', async () => {
      // Arrange
      const request: ProcessRefundRequest = {
        booking_id: 'booking-456',
        refund_type: 'full',
        reason: 'Test',
      };

      supabaseClient.functions.invoke.and.returnValue(
        Promise.resolve({
          data: null,
          error: { message: 'MercadoPago API error' },
        }),
      );

      // Act & Assert
      await expectAsync(service.processRefund(request)).toBeRejectedWithError(/MercadoPago API error/);
      expect(loggerService.error).toHaveBeenCalledWith(
        jasmine.stringContaining('Refund processing failed'),
        'RefundService',
        jasmine.any(Error),
      );
    });

    it('should handle Edge Function returning unsuccessful response', async () => {
      // Arrange
      const request: ProcessRefundRequest = {
        booking_id: 'booking-456',
        refund_type: 'full',
        reason: 'Test',
      };

      supabaseClient.functions.invoke.and.returnValue(
        Promise.resolve({
          data: {
            success: false,
            error: 'Refund already processed',
          },
          error: null,
        }),
      );

      // Act & Assert
      await expectAsync(service.processRefund(request)).toBeRejectedWithError(/Refund already processed/);
    });

    it('should handle network timeout errors', async () => {
      // Arrange
      const request: ProcessRefundRequest = {
        booking_id: 'booking-456',
        refund_type: 'full',
        reason: 'Test',
      };

      supabaseClient.functions.invoke.and.returnValue(Promise.reject(new Error('Network timeout')));

      // Act & Assert
      await expectAsync(service.processRefund(request)).toBeRejectedWithError(/Network timeout/);
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // GET REFUND STATUS TESTS
  // ============================================================================

  describe('getRefundStatus', () => {
    it('should retrieve refund status for booking with refund', async () => {
      // Arrange
      supabaseClient.from('bookings')
        .select('metadata')
        .eq('id', 'booking-456')
        .single.and.returnValue(Promise.resolve({ data: mockBooking, error: null }));

      // Act
      const status = await service.getRefundStatus('booking-456');

      // Assert
      expect(status.has_refund).toBe(true);
      expect(status.refund_id).toBe('refund-123');
      expect(status.refund_amount).toBe(5000);
      expect(status.refund_status).toBe('approved');
      expect(status.refund_date).toBe('2025-11-15T10:00:00Z');
    });

    it('should handle booking without refund', async () => {
      // Arrange
      const bookingWithoutRefund = {
        id: 'booking-456',
        metadata: {},
      };

      supabaseClient.from('bookings')
        .select('metadata')
        .eq('id', 'booking-456')
        .single.and.returnValue(Promise.resolve({ data: bookingWithoutRefund, error: null }));

      // Act
      const status = await service.getRefundStatus('booking-456');

      // Assert
      expect(status.has_refund).toBe(false);
      expect(status.refund_id).toBeUndefined();
      expect(status.refund_amount).toBeUndefined();
    });

    it('should handle booking not found', async () => {
      // Arrange
      supabaseClient.from('bookings')
        .select('metadata')
        .eq('id', 'nonexistent')
        .single.and.returnValue(Promise.resolve({ data: null, error: { message: 'Not found' } }));

      // Act & Assert
      await expectAsync(service.getRefundStatus('nonexistent')).toBeRejectedWithError(/Booking not found/);
      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should handle null metadata', async () => {
      // Arrange
      const bookingWithNullMetadata = {
        id: 'booking-456',
        metadata: null,
      };

      supabaseClient.from('bookings')
        .select('metadata')
        .eq('id', 'booking-456')
        .single.and.returnValue(Promise.resolve({ data: bookingWithNullMetadata, error: null }));

      // Act
      const status = await service.getRefundStatus('booking-456');

      // Assert
      expect(status.has_refund).toBe(false);
    });
  });

  // ============================================================================
  // INTEGRATION SCENARIO TESTS
  // ============================================================================

  describe('processRefund - Real-world Scenarios', () => {
    it('should handle customer-requested cancellation (full refund)', async () => {
      // Arrange
      const request: ProcessRefundRequest = {
        booking_id: 'booking-456',
        refund_type: 'full',
        reason: 'Customer requested cancellation within 24 hours',
      };

      // Act
      const result = await service.processRefund(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.refund.type).toBe('full');
      expect(loggerService.info).toHaveBeenCalledWith(
        jasmine.stringContaining('Refund processed successfully'),
        'RefundService',
      );
    });

    it('should handle late cancellation (partial refund 50%)', async () => {
      // Arrange
      const request: ProcessRefundRequest = {
        booking_id: 'booking-456',
        refund_type: 'partial',
        amount: 2500, // 50% of 5000
        reason: 'Cancellation within 48 hours - 50% penalty',
      };

      const partialRefundResponse: ProcessRefundResponse = {
        success: true,
        refund: {
          id: 'refund-partial-456',
          amount: 2500,
          type: 'partial',
          status: 'approved',
          date_created: '2025-11-15T10:00:00Z',
        },
        booking_id: 'booking-456',
        payment_id: 'payment-789',
      };

      supabaseClient.functions.invoke.and.returnValue(
        Promise.resolve({ data: partialRefundResponse, error: null }),
      );

      // Act
      const result = await service.processRefund(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.refund.amount).toBe(2500);
      expect(result.refund.type).toBe('partial');
    });

    it('should handle service failure (full refund)', async () => {
      // Arrange
      const request: ProcessRefundRequest = {
        booking_id: 'booking-456',
        refund_type: 'full',
        reason: 'Car not available - service failure',
      };

      // Act
      const result = await service.processRefund(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.refund.type).toBe('full');
    });
  });
});
