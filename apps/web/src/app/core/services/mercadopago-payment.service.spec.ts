import { TestBed } from '@angular/core/testing';
import {
  MercadoPagoPaymentService,
  ProcessBookingPaymentRequest,
  ProcessBookingPaymentResponse,
} from './mercadopago-payment.service';
import { SupabaseClientService } from './supabase-client.service';

describe('MercadoPagoPaymentService', () => {
  let service: MercadoPagoPaymentService;
  let mockSupabaseClient: any;
  let fetchSpy: jasmine.Spy;

  const mockSession = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    user: { id: 'user-123', email: 'test@example.com' },
  };

  const mockRequest: ProcessBookingPaymentRequest = {
    booking_id: 'booking-123',
    card_token: 'card-token-456',
    issuer_id: 'issuer-001',
    installments: 1,
  };

  const mockSuccessResponse: ProcessBookingPaymentResponse = {
    success: true,
    payment_id: 789,
    status: 'approved',
    status_detail: 'accredited',
    booking_id: 'booking-123',
    booking_status: 'confirmed',
  };

  beforeEach(() => {
    mockSupabaseClient = {
      auth: {
        getSession: jasmine.createSpy('getSession').and.resolveTo({
          data: { session: mockSession },
          error: null,
        }),
      },
      supabaseUrl: 'https://test.supabase.co',
    };

    fetchSpy = jasmine.createSpy('fetch').and.resolveTo({
      ok: true,
      json: async () => mockSuccessResponse,
    } as unknown as Response);

    (window as any).fetch = fetchSpy;

    TestBed.configureTestingModule({
      providers: [
        MercadoPagoPaymentService,
        {
          provide: SupabaseClientService,
          useValue: { getClient: () => mockSupabaseClient },
        },
      ],
    });

    service = TestBed.inject(MercadoPagoPaymentService);
  });

  afterEach(() => {
    // Restore original fetch if needed
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ========================================
  // processBookingPayment
  // ========================================
  describe('processBookingPayment', () => {
    it('should process payment successfully', async () => {
      const result = await service.processBookingPayment(mockRequest);

      expect(result.success).toBe(true);
      expect(result.payment_id).toBe(789);
      expect(result.status).toBe('approved');
      expect(result.booking_id).toBe('booking-123');
    });

    it('should call edge function with correct URL', async () => {
      await service.processBookingPayment(mockRequest);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/mercadopago-process-booking-payment',
        jasmine.any(Object),
      );
    });

    it('should include authorization header with access token', async () => {
      await service.processBookingPayment(mockRequest);

      expect(fetchSpy).toHaveBeenCalledWith(
        jasmine.any(String),
        jasmine.objectContaining({
          method: 'POST',
          headers: jasmine.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-access-token',
          }),
        }),
      );
    });

    it('should send request body with all fields', async () => {
      await service.processBookingPayment(mockRequest);

      const callArgs = fetchSpy.calls.mostRecent().args;
      const body = JSON.parse(callArgs[1].body);

      expect(body.booking_id).toBe('booking-123');
      expect(body.card_token).toBe('card-token-456');
      expect(body.issuer_id).toBe('issuer-001');
      expect(body.installments).toBe(1);
    });

    it('should throw error when user not authenticated', async () => {
      mockSupabaseClient.auth.getSession.and.resolveTo({
        data: { session: null },
        error: null,
      });

      await expectAsync(service.processBookingPayment(mockRequest)).toBeRejectedWithError(
        'Usuario no autenticado',
      );
    });

    it('should throw error when HTTP response not ok', async () => {
      fetchSpy.and.resolveTo({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid card token' }),
      } as unknown as Response);

      await expectAsync(service.processBookingPayment(mockRequest)).toBeRejectedWithError(
        'Invalid card token',
      );
    });

    it('should throw generic error when HTTP fails without error message', async () => {
      fetchSpy.and.resolveTo({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      } as unknown as Response);

      await expectAsync(service.processBookingPayment(mockRequest)).toBeRejectedWithError(
        'Error al procesar el pago',
      );
    });

    it('should handle JSON parse error in HTTP error response', async () => {
      fetchSpy.and.resolveTo({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as unknown as Response);

      await expectAsync(service.processBookingPayment(mockRequest)).toBeRejectedWithError(
        /HTTP 500/,
      );
    });

    it('should throw error when response indicates failure', async () => {
      fetchSpy.and.resolveTo({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Payment rejected by bank',
        }),
      } as unknown as Response);

      await expectAsync(service.processBookingPayment(mockRequest)).toBeRejectedWithError(
        'Payment rejected by bank',
      );
    });

    it('should throw generic error when response fails without message', async () => {
      fetchSpy.and.resolveTo({
        ok: true,
        json: async () => ({
          success: false,
        }),
      } as unknown as Response);

      await expectAsync(service.processBookingPayment(mockRequest)).toBeRejectedWithError(
        'Error desconocido al procesar el pago',
      );
    });

    it('should handle network errors', async () => {
      fetchSpy.and.rejectWith(new Error('Network error'));

      await expectAsync(service.processBookingPayment(mockRequest)).toBeRejectedWithError(
        'Network error',
      );
    });

    it('should process payment with minimal request (no optional fields)', async () => {
      const minimalRequest: ProcessBookingPaymentRequest = {
        booking_id: 'booking-456',
        card_token: 'token-789',
      };

      const result = await service.processBookingPayment(minimalRequest);

      expect(result.success).toBe(true);

      const callArgs = fetchSpy.calls.mostRecent().args;
      const body = JSON.parse(callArgs[1].body);

      expect(body.booking_id).toBe('booking-456');
      expect(body.card_token).toBe('token-789');
      expect(body.issuer_id).toBeUndefined();
      expect(body.installments).toBeUndefined();
    });
  });
});
