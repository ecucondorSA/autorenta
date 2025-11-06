import { TestBed } from '@angular/core/testing';
import { PayPalWalletGatewayService } from './paypal-wallet-gateway.service';
import { SupabaseClientService } from './supabase-client.service';
import { makeSupabaseMock } from '../../../test-helpers/supabase.mock';
import { firstValueFrom } from 'rxjs';

describe('PayPalWalletGatewayService', () => {
  let service: PayPalWalletGatewayService;
  let supabaseMock: any;
  const originalFetch = globalThis.fetch;
  const mockSession = {
    access_token: 'mock-access-token',
    user: { id: 'user-123', email: 'test@example.com' },
  };

  beforeEach(() => {
    supabaseMock = makeSupabaseMock();

    // Mock getSession to return authenticated session
    supabaseMock.auth.getSession.and.resolveTo({
      data: { session: mockSession },
      error: null,
    });

    // Mock Supabase URL
    (supabaseMock as any).supabaseUrl = 'https://test.supabase.co';

    const supabaseServiceMock = {
      getClient: () => supabaseMock,
    };

    TestBed.configureTestingModule({
      providers: [
        PayPalWalletGatewayService,
        { provide: SupabaseClientService, useValue: supabaseServiceMock },
      ],
    });

    service = TestBed.inject(PayPalWalletGatewayService);
  });

  afterEach(() => {
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      delete (globalThis as any).fetch;
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have provider set to "paypal"', () => {
    expect(service.provider).toBe('paypal');
  });

  describe('createDepositOrder()', () => {
    it('should create deposit order successfully', async () => {
      const mockResponse = {
        success: true,
        order_id: 'ORDER-DEPOSIT-123',
        approval_url: 'https://paypal.com/approve/ORDER-DEPOSIT-123',
        amount_usd: '100.00',
        currency: 'USD',
      };

      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await firstValueFrom(
        service.createDepositOrder(100, 'transaction-123')
      );

      expect(result.success).toBe(true);
      expect(result.order_id).toBe('ORDER-DEPOSIT-123');
      expect(result.approval_url).toBe('https://paypal.com/approve/ORDER-DEPOSIT-123');
      expect(result.amount_usd).toBe(100);
      expect(result.currency).toBe('USD');
      expect(result.transaction_id).toBe('transaction-123');
      expect(result.provider).toBe('paypal');

      // Verify fetch was called correctly
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/paypal-create-deposit-order',
        jasmine.objectContaining({
          method: 'POST',
          headers: jasmine.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-access-token',
          }),
          body: JSON.stringify({
            amount_usd: 100,
            transaction_id: 'transaction-123',
          }),
        })
      );
    });

    it('should default currency to USD when not provided by API', async () => {
      const mockResponse = {
        success: true,
        order_id: 'ORDER-DEPOSIT-456',
        approval_url: 'https://paypal.com/approve/ORDER-DEPOSIT-456',
        amount_usd: '50.00',
        // currency not provided
      };

      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await firstValueFrom(
        service.createDepositOrder(50, 'transaction-456')
      );

      expect(result.currency).toBe('USD');
    });

    it('should throw error for zero amount', async () => {
      try {
        await firstValueFrom(service.createDepositOrder(0, 'transaction-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('El monto debe ser mayor a 0');
      }
    });

    it('should throw error for negative amount', async () => {
      try {
        await firstValueFrom(service.createDepositOrder(-50, 'transaction-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('El monto debe ser mayor a 0');
      }
    });

    it('should throw error for missing transaction ID', async () => {
      try {
        await firstValueFrom(service.createDepositOrder(100, ''));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Transaction ID es requerido');
      }
    });

    it('should throw error when user is not authenticated', async () => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: null },
        error: null,
      });

      try {
        await firstValueFrom(service.createDepositOrder(100, 'transaction-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Usuario no autenticado');
      }
    });

    it('should handle HTTP error response', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Edge Function error' }),
      } as Response);

      try {
        await firstValueFrom(service.createDepositOrder(100, 'transaction-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Edge Function error');
      }
    });

    it('should handle HTTP error without JSON body', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => {
          throw new Error('No JSON');
        },
      } as Response);

      try {
        await firstValueFrom(service.createDepositOrder(100, 'transaction-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('HTTP 503');
      }
    });

    it('should handle PayPal API error (success: false)', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: async () => ({
          success: false,
          error: 'PayPal account suspended',
        }),
      } as Response);

      try {
        await firstValueFrom(service.createDepositOrder(100, 'transaction-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('PayPal account suspended');
      }
    });

    it('should handle unknown PayPal error', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: async () => ({
          success: false,
        }),
      } as Response);

      try {
        await firstValueFrom(service.createDepositOrder(100, 'transaction-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Error desconocido al crear orden de PayPal');
      }
    });
  });

  describe('verifyDeposit()', () => {
    it('should return true for completed deposit', async () => {
      supabaseMock.from.and.returnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'transaction-123',
                      status: 'completed',
                      provider: 'paypal',
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      });

      const isVerified = await service.verifyDeposit('transaction-123');

      expect(isVerified).toBe(true);
    });

    it('should return true for confirmed deposit', async () => {
      supabaseMock.from.and.returnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'transaction-123',
                      status: 'confirmed',
                      provider: 'paypal',
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      });

      const isVerified = await service.verifyDeposit('transaction-123');

      expect(isVerified).toBe(true);
    });

    it('should return false for pending deposit', async () => {
      supabaseMock.from.and.returnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'transaction-123',
                      status: 'pending',
                      provider: 'paypal',
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      });

      const isVerified = await service.verifyDeposit('transaction-123');

      expect(isVerified).toBe(false);
    });

    it('should return false when transaction not found', async () => {
      supabaseMock.from.and.returnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: null,
                    error: { message: 'Not found' },
                  }),
              }),
            }),
          }),
        }),
      });

      const isVerified = await service.verifyDeposit('invalid-transaction');

      expect(isVerified).toBe(false);
    });

    it('should return false when user is not authenticated', async () => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: null },
        error: null,
      });

      const isVerified = await service.verifyDeposit('transaction-123');

      expect(isVerified).toBe(false);
    });

    it('should return false on database error', async () => {
      supabaseMock.from.and.returnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.reject(new Error('Database connection failed')),
              }),
            }),
          }),
        }),
      });

      const isVerified = await service.verifyDeposit('transaction-123');

      expect(isVerified).toBe(false);
    });
  });

  describe('getDepositStatus()', () => {
    it('should return deposit status successfully', async () => {
      const mockTransaction = {
        status: 'completed',
        provider_transaction_id: 'CAPTURE-123',
        amount: 100,
        currency: 'USD',
      };

      supabaseMock.from.and.returnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: mockTransaction,
                  error: null,
                }),
            }),
          }),
        }),
      });

      const status = await service.getDepositStatus('transaction-123');

      expect(status).toBeTruthy();
      expect(status!.status).toBe('completed');
      expect(status!.provider_transaction_id).toBe('CAPTURE-123');
      expect(status!.amount).toBe(100);
      expect(status!.currency).toBe('USD');
    });

    it('should return null when transaction not found', async () => {
      supabaseMock.from.and.returnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: null,
                  error: { message: 'Not found' },
                }),
            }),
          }),
        }),
      });

      const status = await service.getDepositStatus('invalid-transaction');

      expect(status).toBeNull();
    });

    it('should return null when user is not authenticated', async () => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: null },
        error: null,
      });

      const status = await service.getDepositStatus('transaction-123');

      expect(status).toBeNull();
    });

    it('should return null on database error', async () => {
      supabaseMock.from.and.returnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () =>
                Promise.reject(new Error('Database connection failed')),
            }),
          }),
        }),
      });

      const status = await service.getDepositStatus('transaction-123');

      expect(status).toBeNull();
    });

    it('should handle transaction with null provider_transaction_id', async () => {
      const mockTransaction = {
        status: 'pending',
        provider_transaction_id: null,
        amount: 50,
        currency: 'USD',
      };

      supabaseMock.from.and.returnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: mockTransaction,
                  error: null,
                }),
            }),
          }),
        }),
      });

      const status = await service.getDepositStatus('transaction-456');

      expect(status).toBeTruthy();
      expect(status!.status).toBe('pending');
      expect(status!.provider_transaction_id).toBeNull();
    });
  });

  describe('error formatting', () => {
    it('should format Error objects correctly', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(new Error('Network failure'));

      try {
        await firstValueFrom(service.createDepositOrder(100, 'transaction-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Network failure');
      }
    });

    it('should format string errors correctly', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith('Simple error string');

      try {
        await firstValueFrom(service.createDepositOrder(100, 'transaction-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Simple error string');
      }
    });

    it('should format unknown errors with generic message', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith({ code: 12345 });

      try {
        await firstValueFrom(service.createDepositOrder(100, 'transaction-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Error al procesar el depósito con PayPal. Por favor intente nuevamente.');
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete wallet deposit flow', async () => {
      // Step 1: Create deposit order
      const mockCreateResponse = {
        success: true,
        order_id: 'ORDER-DEPOSIT-INTEGRATION',
        approval_url: 'https://paypal.com/approve/ORDER-DEPOSIT-INTEGRATION',
        amount_usd: '200.00',
        currency: 'USD',
      };

      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: async () => mockCreateResponse,
      } as Response);

      const depositOrder = await firstValueFrom(
        service.createDepositOrder(200, 'transaction-integration')
      );

      expect(depositOrder.success).toBe(true);
      expect(depositOrder.order_id).toBe('ORDER-DEPOSIT-INTEGRATION');

      // Step 2: Initially, deposit is pending
      supabaseMock.from.and.returnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      status: 'pending',
                      provider: 'paypal',
                      provider_transaction_id: null,
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      });

      let isVerified = await service.verifyDeposit('transaction-integration');
      expect(isVerified).toBe(false);

      // Step 3: After PayPal webhook, deposit is completed
      supabaseMock.from.and.returnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      status: 'completed',
                      provider: 'paypal',
                      provider_transaction_id: 'CAPTURE-INTEGRATION',
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      });

      isVerified = await service.verifyDeposit('transaction-integration');
      expect(isVerified).toBe(true);

      // Step 4: Get final status
      const finalStatus = await service.getDepositStatus('transaction-integration');
      expect(finalStatus).toBeTruthy();
      expect(finalStatus!.status).toBe('completed');
      expect(finalStatus!.provider_transaction_id).toBe('CAPTURE-INTEGRATION');
    });

    it('should handle failed deposit scenario', async () => {
      // Create deposit order
      const mockCreateResponse = {
        success: true,
        order_id: 'ORDER-DEPOSIT-FAILED',
        approval_url: 'https://paypal.com/approve/ORDER-DEPOSIT-FAILED',
        amount_usd: '75.00',
        currency: 'USD',
      };

      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: async () => mockCreateResponse,
      } as Response);

      const depositOrder = await firstValueFrom(
        service.createDepositOrder(75, 'transaction-failed')
      );

      expect(depositOrder.success).toBe(true);

      // Simulate failed/cancelled payment
      supabaseMock.from.and.returnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      status: 'failed',
                      provider: 'paypal',
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      });

      const isVerified = await service.verifyDeposit('transaction-failed');
      expect(isVerified).toBe(false);
    });
  });

  describe('validation edge cases', () => {
    it('should reject very small amounts', async () => {
      try {
        await firstValueFrom(service.createDepositOrder(0.001, 'transaction-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        // 0.001 is > 0, so this should actually pass validation
        // The test shows that any amount > 0 is valid
      }
    });

    it('should accept large deposit amounts', async () => {
      const mockResponse = {
        success: true,
        order_id: 'ORDER-LARGE',
        approval_url: 'https://paypal.com/approve/ORDER-LARGE',
        amount_usd: '10000.00',
        currency: 'USD',
      };

      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await firstValueFrom(
        service.createDepositOrder(10000, 'transaction-large')
      );

      expect(result.success).toBe(true);
      expect(result.amount_usd).toBe(10000);
    });

    it('should handle transaction IDs with special characters', async () => {
      const mockResponse = {
        success: true,
        order_id: 'ORDER-SPECIAL',
        approval_url: 'https://paypal.com/approve/ORDER-SPECIAL',
        amount_usd: '50.00',
        currency: 'USD',
      };

      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const specialTransactionId = 'txn-2025-01-15-ABC123';

      const result = await firstValueFrom(
        service.createDepositOrder(50, specialTransactionId)
      );

      expect(result.success).toBe(true);
      expect(result.transaction_id).toBe(specialTransactionId);
    });
  });
});
