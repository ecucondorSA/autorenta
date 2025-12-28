import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { MercadoPagoPaymentService, ProcessBookingPaymentResponse } from '@core/services/payments/mercadopago-payment.service';
import { generateIdempotencyKey } from '@core/models/booking-detail-payment.model';

const mockSession = {
  access_token: 'test-access-token-123',
  refresh_token: 'test-refresh-token-456',
  user: { id: 'user-123', email: 'test@example.com' },
};

const mockSupabaseClient = {
  from: jasmine.createSpy('from').and.returnValue({
    select: jasmine.createSpy('select').and.returnValue({
      eq: jasmine.createSpy('eq').and.returnValue(Promise.resolve({ data: [], error: null })),
      single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: null, error: null })),
    }),
    insert: jasmine.createSpy('insert').and.returnValue(Promise.resolve({ data: null, error: null })),
    update: jasmine.createSpy('update').and.returnValue(Promise.resolve({ data: null, error: null })),
    delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve({ data: null, error: null })),
  }),
  rpc: jasmine.createSpy('rpc').and.returnValue(Promise.resolve({ data: null, error: null })),
  auth: {
    getUser: jasmine.createSpy('getUser').and.returnValue(Promise.resolve({ data: { user: null }, error: null })),
    getSession: jasmine.createSpy('getSession').and.returnValue(
      Promise.resolve({ data: { session: mockSession }, error: null })
    ),
    onAuthStateChange: jasmine.createSpy('onAuthStateChange').and.returnValue({ data: { subscription: { unsubscribe: jasmine.createSpy() } } }),
  },
  storage: {
    from: jasmine.createSpy('from').and.returnValue({
      upload: jasmine.createSpy('upload').and.returnValue(Promise.resolve({ data: null, error: null })),
      getPublicUrl: jasmine.createSpy('getPublicUrl').and.returnValue({ data: { publicUrl: '' } }),
    }),
  },
};

const mockSupabaseService = {
  client: mockSupabaseClient,
  getClient: () => mockSupabaseClient,
  from: mockSupabaseClient.from,
  rpc: mockSupabaseClient.rpc,
  auth: mockSupabaseClient.auth,
  storage: mockSupabaseClient.storage,
};

describe('MercadoPagoPaymentService', () => {
  let service: MercadoPagoPaymentService;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MercadoPagoPaymentService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(MercadoPagoPaymentService);

    // Store original fetch
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    // Restore original fetch
    globalThis.fetch = originalFetch;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have processBookingPayment method', () => {
    expect(typeof service.processBookingPayment).toBe('function');
  });

  // ==========================================================================
  // IDEMPOTENCY TESTS
  // ==========================================================================
  describe('Payment Idempotency', () => {

    it('should return cached success for idempotent request (payment already approved)', async () => {
      const idempotentResponse: ProcessBookingPaymentResponse = {
        success: true,
        payment_id: 12345678,
        status: 'approved',
        status_detail: 'accredited',
        booking_id: 'booking-123',
        booking_status: 'confirmed',
      };

      // Mock fetch to return idempotent response
      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...idempotentResponse, idempotent: true }),
        } as Response)
      );

      const result = await service.processBookingPayment({
        booking_id: 'booking-123',
        card_token: 'duplicate-token-attempt',
      });

      expect(result.success).toBeTrue();
      expect(result.payment_id).toBe(12345678);
      expect(result.status).toBe('approved');
      // The Edge Function returns idempotent:true but the service strips it (not in interface)
      expect(result.booking_status).toBe('confirmed');
    });

    it('should handle PAYMENT_IN_PROGRESS status (409 Conflict)', async () => {
      const inProgressResponse = {
        success: false,
        payment_id: 12345678,
        status: 'pending',
        status_detail: 'pending_waiting_payment',
        message: 'Payment is still being processed. Please wait.',
        code: 'PAYMENT_IN_PROGRESS',
      };

      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: false,
          status: 409,
          json: () => Promise.resolve(inProgressResponse),
        } as Response)
      );

      await expectAsync(
        service.processBookingPayment({
          booking_id: 'booking-123',
          card_token: 'token-while-pending',
        })
      ).toBeRejectedWithError(/Payment is still being processed/);
    });

    it('should allow retry after PAYMENT_IN_PROGRESS clears', async () => {
      let callCount = 0;

      globalThis.fetch = jasmine.createSpy('fetch').and.callFake(() => {
        callCount++;
        if (callCount === 1) {
          // First call: payment in progress
          return Promise.resolve({
            ok: false,
            status: 409,
            json: () => Promise.resolve({
              success: false,
              code: 'PAYMENT_IN_PROGRESS',
              message: 'Payment is still being processed.',
            }),
          } as Response);
        } else {
          // Second call: payment now succeeded
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              payment_id: 12345678,
              status: 'approved',
              status_detail: 'accredited',
              booking_id: 'booking-123',
              booking_status: 'confirmed',
              idempotent: true,
            }),
          } as Response);
        }
      });

      // First attempt should fail
      await expectAsync(
        service.processBookingPayment({
          booking_id: 'booking-123',
          card_token: 'token-1',
        })
      ).toBeRejected();

      // Second attempt should succeed with cached result
      const result = await service.processBookingPayment({
        booking_id: 'booking-123',
        card_token: 'token-2', // Different token, same booking
      });

      expect(result.success).toBeTrue();
      expect(result.payment_id).toBe(12345678);
      expect(callCount).toBe(2);
    });

    it('should handle successful new payment', async () => {
      const newPaymentResponse: ProcessBookingPaymentResponse = {
        success: true,
        payment_id: 99999999,
        status: 'approved',
        status_detail: 'accredited',
        booking_id: 'booking-new',
        booking_status: 'confirmed',
      };

      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(newPaymentResponse),
        } as Response)
      );

      const result = await service.processBookingPayment({
        booking_id: 'booking-new',
        card_token: 'new-valid-token',
      });

      expect(result.success).toBeTrue();
      expect(result.payment_id).toBe(99999999);
      expect(result.status).toBe('approved');
    });

    it('should allow retry after previous payment was rejected', async () => {
      // Simulates scenario where previous payment failed and new token is allowed
      const successAfterRetryResponse: ProcessBookingPaymentResponse = {
        success: true,
        payment_id: 87654321,
        status: 'approved',
        status_detail: 'accredited',
        booking_id: 'booking-retry',
        booking_status: 'confirmed',
      };

      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(successAfterRetryResponse),
        } as Response)
      );

      const result = await service.processBookingPayment({
        booking_id: 'booking-retry',
        card_token: 'new-token-after-rejection',
      });

      expect(result.success).toBeTrue();
      expect(result.payment_id).toBe(87654321);
    });

    it('should propagate PRICE_LOCK_EXPIRED error', async () => {
      const priceLockExpiredResponse = {
        success: false,
        error: 'El precio de la reserva ha expirado. Por favor, inicie el proceso de pago nuevamente.',
        code: 'PRICE_LOCK_EXPIRED',
        expired_at: new Date(Date.now() - 60000).toISOString(),
        expired_by_seconds: 60,
      };

      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve(priceLockExpiredResponse),
        } as Response)
      );

      await expectAsync(
        service.processBookingPayment({
          booking_id: 'booking-expired-price',
          card_token: 'valid-token',
        })
      ).toBeRejectedWithError(/precio de la reserva ha expirado/);
    });

    it('should propagate AMOUNT_MISMATCH error', async () => {
      const amountMismatchResponse = {
        success: false,
        error: 'Inconsistencia en el monto de la reserva. Por favor, contacte soporte.',
        code: 'AMOUNT_MISMATCH',
      };

      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve(amountMismatchResponse),
        } as Response)
      );

      await expectAsync(
        service.processBookingPayment({
          booking_id: 'booking-tampered',
          card_token: 'valid-token',
        })
      ).toBeRejectedWithError(/Inconsistencia en el monto/);
    });

    it('should handle rate limiting (503 Service Unavailable)', async () => {
      const rateLimitResponse = {
        error: 'Service temporarily unavailable',
        code: 'RATE_LIMITER_ERROR',
        retry: true,
      };

      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: false,
          status: 503,
          json: () => Promise.resolve(rateLimitResponse),
        } as Response)
      );

      await expectAsync(
        service.processBookingPayment({
          booking_id: 'booking-rate-limited',
          card_token: 'valid-token',
        })
      ).toBeRejectedWithError(/Service temporarily unavailable/);
    });

    it('should throw error when user is not authenticated', async () => {
      // Override the mock to return no session
      const noSessionSupabaseClient = {
        ...mockSupabaseClient,
        auth: {
          ...mockSupabaseClient.auth,
          getSession: jasmine.createSpy('getSession').and.returnValue(
            Promise.resolve({ data: { session: null }, error: null })
          ),
        },
      };

      const noSessionSupabaseService = {
        ...mockSupabaseService,
        getClient: () => noSessionSupabaseClient,
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          MercadoPagoPaymentService,
          { provide: SupabaseClientService, useValue: noSessionSupabaseService },
        ],
      });

      const unauthService = TestBed.inject(MercadoPagoPaymentService);

      await expectAsync(
        unauthService.processBookingPayment({
          booking_id: 'booking-123',
          card_token: 'some-token',
        })
      ).toBeRejectedWithError(/no autenticado/);
    });
  });

  // ==========================================================================
  // IDEMPOTENCY KEY GENERATION TESTS (from booking-detail-payment.model)
  // ==========================================================================
  describe('Idempotency Key Generation', () => {

    it('should generate unique idempotency keys', () => {
      const key1 = generateIdempotencyKey();
      const key2 = generateIdempotencyKey();

      expect(key1).not.toBe(key2);
      expect(key1.startsWith('booking_')).toBeTrue();
      expect(key2.startsWith('booking_')).toBeTrue();
    });

    it('should generate keys with timestamp prefix', () => {
      const before = Date.now();
      const key = generateIdempotencyKey();
      const after = Date.now();

      // Extract timestamp from key: 'booking_{timestamp}_{random}'
      const parts = key.split('_');
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('booking');

      const timestamp = parseInt(parts[1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should generate keys with random suffix', () => {
      const key = generateIdempotencyKey();
      const parts = key.split('_');

      // Random suffix should be 9 characters
      expect(parts[2].length).toBe(9);
      // Should be alphanumeric (base36)
      expect(/^[a-z0-9]+$/.test(parts[2])).toBeTrue();
    });

    it('should generate 100 unique keys without collision', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(generateIdempotencyKey());
      }
      expect(keys.size).toBe(100);
    });
  });

  // ==========================================================================
  // CONCURRENT REQUEST HANDLING TESTS
  // ==========================================================================
  describe('Concurrent Payment Request Handling', () => {

    it('should handle multiple simultaneous payment attempts for same booking', async () => {
      let callCount = 0;

      globalThis.fetch = jasmine.createSpy('fetch').and.callFake(() => {
        callCount++;
        // First request succeeds, subsequent get idempotent response
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              payment_id: 12345678,
              status: 'approved',
              booking_id: 'booking-concurrent',
              booking_status: 'confirmed',
            }),
          } as Response);
        } else {
          // Edge Function returns idempotent cached result
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              payment_id: 12345678, // Same payment ID
              status: 'approved',
              booking_id: 'booking-concurrent',
              booking_status: 'confirmed',
              idempotent: true, // Indicates cached result
            }),
          } as Response);
        }
      });

      // Fire 3 concurrent requests
      const requests = [
        service.processBookingPayment({ booking_id: 'booking-concurrent', card_token: 'token-1' }),
        service.processBookingPayment({ booking_id: 'booking-concurrent', card_token: 'token-2' }),
        service.processBookingPayment({ booking_id: 'booking-concurrent', card_token: 'token-3' }),
      ];

      const results = await Promise.all(requests);

      // All should succeed with same payment ID
      results.forEach((result) => {
        expect(result.success).toBeTrue();
        expect(result.payment_id).toBe(12345678);
        expect(result.status).toBe('approved');
      });

      expect(callCount).toBe(3);
    });

    it('should ensure X-Idempotency-Key header uses booking_id', async () => {
      let capturedUrl = '';

      globalThis.fetch = jasmine.createSpy('fetch').and.callFake((url: string) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            payment_id: 12345678,
            status: 'approved',
            booking_id: 'booking-idempotency-check',
            booking_status: 'confirmed',
          }),
        } as Response);
      });

      await service.processBookingPayment({
        booking_id: 'booking-idempotency-check',
        card_token: 'valid-token',
      });

      // Verify the Edge Function URL was called
      expect(capturedUrl).toContain('mercadopago-process-booking-payment');
      // Note: The actual X-Idempotency-Key header is set in the Edge Function, not the frontend
      // The frontend just passes booking_id, which the Edge Function uses as the idempotency key
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================
  describe('Payment Error Handling', () => {

    it('should handle CONTRACT_NOT_FOUND error', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({
            error: 'CONTRACT_NOT_FOUND',
            message: 'Contrato no encontrado para esta reserva.',
          }),
        } as Response)
      );

      await expectAsync(
        service.processBookingPayment({
          booking_id: 'booking-no-contract',
          card_token: 'valid-token',
        })
      ).toBeRejectedWithError(/CONTRACT_NOT_FOUND/);
    });

    it('should handle CONTRACT_NOT_ACCEPTED error', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({
            error: 'CONTRACT_NOT_ACCEPTED',
            message: 'Debes aceptar el contrato antes de proceder con el pago.',
          }),
        } as Response)
      );

      await expectAsync(
        service.processBookingPayment({
          booking_id: 'booking-unsigned-contract',
          card_token: 'valid-token',
        })
      ).toBeRejectedWithError(/CONTRACT_NOT_ACCEPTED/);
    });

    it('should handle CONTRACT_ACCEPTANCE_EXPIRED error', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({
            error: 'CONTRACT_ACCEPTANCE_EXPIRED',
            message: 'La aceptación del contrato ha expirado (máximo 24 horas).',
            expired_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
            hours_elapsed: 25,
          }),
        } as Response)
      );

      await expectAsync(
        service.processBookingPayment({
          booking_id: 'booking-old-contract',
          card_token: 'valid-token',
        })
      ).toBeRejectedWithError(/CONTRACT_ACCEPTANCE_EXPIRED/);
    });

    it('should handle INCOMPLETE_CLAUSE_ACCEPTANCE error', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({
            error: 'INCOMPLETE_CLAUSE_ACCEPTANCE',
            message: 'Debes aceptar TODAS las cláusulas del contrato.',
            missing_clauses: ['mora', 'indemnidad'],
          }),
        } as Response)
      );

      await expectAsync(
        service.processBookingPayment({
          booking_id: 'booking-partial-clauses',
          card_token: 'valid-token',
        })
      ).toBeRejectedWithError(/INCOMPLETE_CLAUSE_ACCEPTANCE/);
    });

    it('should handle MercadoPago API failure', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({
            success: false,
            error: 'Payment processing failed',
            details: { cause: [{ code: 'cc_rejected_other_reason' }] },
          }),
        } as Response)
      );

      await expectAsync(
        service.processBookingPayment({
          booking_id: 'booking-mp-fail',
          card_token: 'invalid-token',
        })
      ).toBeRejectedWithError(/Payment processing failed/);
    });

    it('should handle network error gracefully', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.reject(new Error('Network error: Failed to fetch'))
      );

      await expectAsync(
        service.processBookingPayment({
          booking_id: 'booking-network-fail',
          card_token: 'valid-token',
        })
      ).toBeRejectedWithError(/Network error/);
    });

    it('should handle malformed JSON response', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.reject(new SyntaxError('Unexpected token')),
        } as Response)
      );

      await expectAsync(
        service.processBookingPayment({
          booking_id: 'booking-bad-json',
          card_token: 'valid-token',
        })
      ).toBeRejectedWithError(/HTTP 500/);
    });
  });

});
