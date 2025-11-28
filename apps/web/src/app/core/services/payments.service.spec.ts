import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import type { PaymentIntent } from '../models';
import { FxService } from './fx.service';
import { PaymentsService } from './payments.service';
import { SupabaseClientService } from './supabase-client.service';

// Helper to create chainable Supabase mock queries
function createMockQuery(finalResponse: { data: unknown; error: unknown }): Record<string, jasmine.Spy> {
  const query: Record<string, jasmine.Spy> = {};
  query['select'] = jasmine.createSpy('select').and.callFake(() => query);
  query['eq'] = jasmine.createSpy('eq').and.callFake(() => query);
  query['insert'] = jasmine.createSpy('insert').and.callFake(() => query);
  query['single'] = jasmine.createSpy('single').and.resolveTo(finalResponse);
  return query;
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockSupabaseClient: any;
  let mockFxService: jasmine.SpyObj<FxService>;
  let originalPaymentsWebhookUrl: string;
  let originalProduction: boolean;

  const mockBooking = {
    id: 'booking-123',
    total_amount: 100000,
    currency: 'ARS',
    renter_id: 'user-456',
  };

  const mockPaymentIntent: PaymentIntent = {
    id: 'intent-123',
    booking_id: 'booking-123',
    provider: 'mercadopago',
    status: 'pending',
    created_at: '2025-11-28T10:00:00Z',
  };

  beforeEach(() => {
    // Store original values
    originalPaymentsWebhookUrl = environment.paymentsWebhookUrl;
    originalProduction = environment.production;

    // Default to development mode
    (environment as any).production = false;
    (environment as any).paymentsWebhookUrl = 'http://localhost:8787/webhooks/payments';

    // Create Supabase mock
    mockSupabaseClient = {
      from: jasmine.createSpy('from'),
    };

    // Create FxService mock
    mockFxService = jasmine.createSpyObj('FxService', ['getCurrentRateAsync']);
    mockFxService.getCurrentRateAsync.and.resolveTo(1000); // 1 USD = 1000 ARS

    TestBed.configureTestingModule({
      providers: [
        PaymentsService,
        {
          provide: SupabaseClientService,
          useValue: { getClient: () => mockSupabaseClient },
        },
        { provide: FxService, useValue: mockFxService },
      ],
    });

    service = TestBed.inject(PaymentsService);
  });

  afterEach(() => {
    // Restore original values
    (environment as any).paymentsWebhookUrl = originalPaymentsWebhookUrl;
    (environment as any).production = originalProduction;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ========================================
  // createIntent
  // ========================================
  describe('createIntent', () => {
    beforeEach(() => {
      // Setup default mocks for createIntent
      const bookingQuery = createMockQuery({
        data: mockBooking,
        error: null,
      });

      const insertQuery = createMockQuery({
        data: mockPaymentIntent,
        error: null,
      });

      mockSupabaseClient.from.and.callFake((table: string) => {
        if (table === 'bookings') return bookingQuery;
        if (table === 'payment_intents') return insertQuery;
        return {};
      });
    });

    it('should create a payment intent for a valid booking', async () => {
      const result = await service.createIntent('booking-123');

      expect(result).toEqual(mockPaymentIntent);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bookings');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('payment_intents');
      expect(mockFxService.getCurrentRateAsync).toHaveBeenCalledWith('USD', 'ARS');
    });

    it('should throw error when booking not found', async () => {
      const bookingQuery = createMockQuery({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      mockSupabaseClient.from.and.returnValue(bookingQuery);

      await expectAsync(service.createIntent('invalid-booking')).toBeRejectedWithError(
        /Booking no encontrado/,
      );
    });

    it('should throw error when amount is invalid', async () => {
      const bookingQuery = createMockQuery({
        data: { ...mockBooking, total_amount: 0 },
        error: null,
      });

      mockSupabaseClient.from.and.returnValue(bookingQuery);

      await expectAsync(service.createIntent('booking-123')).toBeRejectedWithError(
        /Monto inválido/,
      );
    });

    it('should throw error when FX rate is unavailable', async () => {
      mockFxService.getCurrentRateAsync.and.resolveTo(0);

      const bookingQuery = createMockQuery({
        data: mockBooking,
        error: null,
      });

      mockSupabaseClient.from.and.returnValue(bookingQuery);

      await expectAsync(service.createIntent('booking-123')).toBeRejectedWithError(
        /tasa de cambio/,
      );
    });

    it('should handle USD currency correctly', async () => {
      const usdBooking = { ...mockBooking, currency: 'USD', total_amount: 100 };

      const bookingQuery = createMockQuery({
        data: usdBooking,
        error: null,
      });

      const insertQuery = createMockQuery({
        data: mockPaymentIntent,
        error: null,
      });

      mockSupabaseClient.from.and.callFake((table: string) => {
        if (table === 'bookings') return bookingQuery;
        if (table === 'payment_intents') return insertQuery;
        return {};
      });

      await service.createIntent('booking-123');

      expect(insertQuery['insert']).toHaveBeenCalledWith(
        jasmine.objectContaining({
          amount_usd: 100,
          amount_ars: 100000, // 100 USD * 1000 rate
        }),
      );
    });
  });

  // ========================================
  // getStatus
  // ========================================
  describe('getStatus', () => {
    it('should return payment intent status', async () => {
      const query = createMockQuery({
        data: { ...mockPaymentIntent, status: 'completed' },
        error: null,
      });

      mockSupabaseClient.from.and.returnValue(query);

      const result = await service.getStatus('intent-123');

      expect(result?.status).toBe('completed');
      expect(query['eq']).toHaveBeenCalledWith('id', 'intent-123');
    });

    it('should return null when payment intent not found', async () => {
      const query = createMockQuery({
        data: null,
        error: { code: 'PGRST116' },
      });

      mockSupabaseClient.from.and.returnValue(query);

      const result = await service.getStatus('missing-intent');

      expect(result).toBeNull();
    });

    it('should throw error for other database errors', async () => {
      const query = createMockQuery({
        data: null,
        error: { code: 'OTHER_ERROR', message: 'Database error' },
      });

      mockSupabaseClient.from.and.returnValue(query);

      await expectAsync(service.getStatus('intent-123')).toBeRejected();
    });
  });

  // ========================================
  // markAsPaid (DEV ONLY)
  // ========================================
  describe('markAsPaid', () => {
    it('should call webhook in development mode', async () => {
      const fetchSpy = spyOn(window, 'fetch').and.resolveTo(
        new Response(null, { status: 200 }),
      );

      await service.markAsPaid('intent-123');

      expect(fetchSpy).toHaveBeenCalledWith('http://localhost:8787/webhooks/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'mock',
          intent_id: 'intent-123',
          status: 'approved',
        }),
      });
    });

    it('should throw error in production mode', async () => {
      (environment as any).production = true;

      await expectAsync(service.markAsPaid('intent-123')).toBeRejectedWithError(
        /deprecado en producción/,
      );
    });

    it('should throw error when webhook URL not configured', async () => {
      (environment as any).paymentsWebhookUrl = '';

      await expectAsync(service.markAsPaid('intent-123')).toBeRejectedWithError(
        /paymentsWebhookUrl no configurado/,
      );
    });

    it('should throw error when webhook responds with error', async () => {
      spyOn(window, 'fetch').and.resolveTo(new Response(null, { status: 500 }));

      await expectAsync(service.markAsPaid('intent-123')).toBeRejectedWithError(
        /Webhook respondió 500/,
      );
    });
  });

  // ========================================
  // triggerMockPayment (DEV ONLY)
  // ========================================
  describe('triggerMockPayment', () => {
    it('should trigger approved payment webhook', async () => {
      const fetchSpy = spyOn(window, 'fetch').and.resolveTo(
        new Response(null, { status: 200 }),
      );

      await service.triggerMockPayment('booking-123', 'approved');

      expect(fetchSpy).toHaveBeenCalledWith('http://localhost:8787/webhooks/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'mock',
          booking_id: 'booking-123',
          status: 'approved',
        }),
      });
    });

    it('should trigger rejected payment webhook', async () => {
      const fetchSpy = spyOn(window, 'fetch').and.resolveTo(
        new Response(null, { status: 200 }),
      );

      await service.triggerMockPayment('booking-123', 'rejected');

      expect(fetchSpy).toHaveBeenCalledWith(
        jasmine.any(String),
        jasmine.objectContaining({
          body: jasmine.stringContaining('"status":"rejected"'),
        }),
      );
    });

    it('should throw error in production mode', async () => {
      (environment as any).production = true;

      await expectAsync(
        service.triggerMockPayment('booking-123', 'approved'),
      ).toBeRejectedWithError(/solo disponible en desarrollo/);
    });
  });

  // ========================================
  // createPaymentIntentWithDetails
  // ========================================
  describe('createPaymentIntentWithDetails', () => {
    it('should create payment intent with wallet provider', async () => {
      const insertQuery = createMockQuery({
        data: { ...mockPaymentIntent, provider: 'wallet' },
        error: null,
      });

      mockSupabaseClient.from.and.returnValue(insertQuery);

      const result = await service.createPaymentIntentWithDetails({
        booking_id: 'booking-123',
        payment_method: 'wallet',
        amount_cents: 10000,
        status: 'pending',
      });

      expect(insertQuery['insert']).toHaveBeenCalledWith(
        jasmine.objectContaining({
          booking_id: 'booking-123',
          provider: 'wallet',
          status: 'pending',
        }),
      );
      expect(result.provider).toBe('wallet');
    });

    it('should create payment intent with mercadopago provider for card', async () => {
      const insertQuery = createMockQuery({
        data: { ...mockPaymentIntent, provider: 'mercadopago' },
        error: null,
      });

      mockSupabaseClient.from.and.returnValue(insertQuery);

      await service.createPaymentIntentWithDetails({
        booking_id: 'booking-123',
        payment_method: 'credit_card',
        amount_cents: 10000,
        status: 'pending',
      });

      expect(insertQuery['insert']).toHaveBeenCalledWith(
        jasmine.objectContaining({
          provider: 'mercadopago',
        }),
      );
    });
  });

  // ========================================
  // processPayment
  // ========================================
  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      spyOn(service, 'createIntent').and.resolveTo(mockPaymentIntent);
      spyOn(service, 'markAsPaid').and.resolveTo();
      spyOn(service, 'getStatus').and.resolveTo({
        ...mockPaymentIntent,
        status: 'completed',
      } as PaymentIntent);

      const result = await service.processPayment('booking-123');

      expect(result.success).toBe(true);
      expect(result.paymentIntentId).toBe('intent-123');
      expect(service.createIntent).toHaveBeenCalledWith('booking-123');
      expect(service.markAsPaid).toHaveBeenCalledWith('intent-123');
      expect(service.getStatus).toHaveBeenCalledWith('intent-123');
    });

    it('should return error when intent creation fails', async () => {
      spyOn(service, 'createIntent').and.rejectWith(new Error('Invalid booking'));

      const result = await service.processPayment('booking-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid booking');
    });

    it('should return error when payment does not complete', async () => {
      spyOn(service, 'createIntent').and.resolveTo(mockPaymentIntent);
      spyOn(service, 'markAsPaid').and.resolveTo();
      spyOn(service, 'getStatus').and.resolveTo({
        ...mockPaymentIntent,
        status: 'pending',
      } as PaymentIntent);

      const result = await service.processPayment('booking-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('no se completó');
    });

    it('should retry on network errors', async () => {
      let callCount = 0;
      spyOn(service, 'createIntent').and.callFake(async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Network error');
        }
        return mockPaymentIntent;
      });
      spyOn(service, 'markAsPaid').and.resolveTo();
      spyOn(service, 'getStatus').and.resolveTo({
        ...mockPaymentIntent,
        status: 'completed',
      } as PaymentIntent);

      // Mock delay to speed up test
      spyOn<any>(service, 'delay').and.resolveTo();

      const result = await service.processPayment('booking-123');

      expect(result.success).toBe(true);
      expect(callCount).toBe(3);
    });

    it('should not retry validation errors', async () => {
      let callCount = 0;
      spyOn(service, 'createIntent').and.callFake(async () => {
        callCount++;
        throw new Error('Invalid booking ID');
      });

      const result = await service.processPayment('booking-123');

      expect(result.success).toBe(false);
      expect(callCount).toBe(1); // No retries for validation errors
    });

    it('should stop retrying after max retries', async () => {
      let callCount = 0;
      spyOn(service, 'createIntent').and.callFake(async () => {
        callCount++;
        throw new Error('Network error');
      });

      // Mock delay to speed up test
      spyOn<any>(service, 'delay').and.resolveTo();

      const result = await service.processPayment('booking-123');

      expect(result.success).toBe(false);
      expect(callCount).toBe(4); // 1 initial + 3 retries
    });

    it('should skip markAsPaid in production mode', async () => {
      (environment as any).production = true;

      spyOn(service, 'createIntent').and.resolveTo(mockPaymentIntent);
      spyOn(service, 'markAsPaid').and.resolveTo();
      spyOn(service, 'getStatus').and.resolveTo({
        ...mockPaymentIntent,
        status: 'completed',
      } as PaymentIntent);

      await service.processPayment('booking-123');

      expect(service.markAsPaid).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Alias methods
  // ========================================
  describe('createPaymentIntent (alias)', () => {
    it('should call createIntent', async () => {
      spyOn(service, 'createIntent').and.resolveTo(mockPaymentIntent);

      const result = await service.createPaymentIntent('booking-123', 'mercadopago');

      expect(service.createIntent).toHaveBeenCalledWith('booking-123');
      expect(result).toEqual(mockPaymentIntent);
    });
  });

  describe('simulateWebhook (alias)', () => {
    it('should call markAsPaid', async () => {
      spyOn(service, 'markAsPaid').and.resolveTo();

      await service.simulateWebhook('mock', 'intent-123', 'approved');

      expect(service.markAsPaid).toHaveBeenCalledWith('intent-123');
    });
  });

  // ========================================
  // isRetryableError (private method testing)
  // ========================================
  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      const isRetryable = (service as any).isRetryableError.bind(service);

      expect(isRetryable(new Error('Network error'))).toBe(true);
      expect(isRetryable(new Error('Request timeout'))).toBe(true);
      expect(isRetryable(new Error('ECONNRESET'))).toBe(true);
      expect(isRetryable(new Error('ETIMEDOUT'))).toBe(true);
      expect(isRetryable(new Error('Failed to fetch'))).toBe(true);
    });

    it('should identify validation errors as non-retryable', () => {
      const isRetryable = (service as any).isRetryableError.bind(service);

      expect(isRetryable(new Error('Invalid booking ID'))).toBe(false);
      expect(isRetryable(new Error('Monto inválido'))).toBe(false);
      expect(isRetryable(new Error('Booking no encontrado'))).toBe(false);
    });
  });
});
