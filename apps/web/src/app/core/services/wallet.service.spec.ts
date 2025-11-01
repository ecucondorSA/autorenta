import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { WalletService } from './wallet.service';
import { SupabaseClientService } from './supabase-client.service';

describe('WalletService', () => {
  let service: WalletService;
  let supabaseClient: any;
  let rpcHandlers: Record<string, () => Promise<{ data: unknown; error: unknown }>>;
  let originalSupabaseUrl: string;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    originalSupabaseUrl = environment.supabaseUrl;
    environment.supabaseUrl = 'https://example-project.supabase.co';

    rpcHandlers = {};

    supabaseClient = {
      rpc: jasmine.createSpy('rpc').and.callFake((fn: string) => {
        const handler = rpcHandlers[fn];
        if (handler) {
          return handler();
        }
        return Promise.resolve({ data: null, error: null });
      }),
      auth: {
        getSession: jasmine.createSpy('getSession').and.resolveTo({
          data: { session: { access_token: 'token-123' } },
        }),
      },
    };

    const supabaseServiceMock = {
      getClient: () => supabaseClient,
    };

    TestBed.configureTestingModule({
      providers: [WalletService, { provide: SupabaseClientService, useValue: supabaseServiceMock }],
    });

    service = TestBed.inject(WalletService);
  });

  afterEach(() => {
    environment.supabaseUrl = originalSupabaseUrl;
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      delete (globalThis as any).fetch;
    }
  });

  it('inicia un depósito y crea preferencia en Mercado Pago', async () => {
    rpcHandlers['wallet_initiate_deposit'] = () =>
      Promise.resolve({
        data: [
          {
            success: true,
            transaction_id: 'tx-1',
            message: 'pending',
          },
        ],
        error: null,
      });

    const fetchSpy = jasmine.createSpy('fetch').and.callFake(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          init_point: 'https://mercadopago.test/init',
          sandbox_init_point: 'https://mercadopago.test/sandbox',
        }),
      } as any),
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    spyOn(service, 'getBalance').and.resolveTo({
      available_balance: 0,
      locked_balance: 0,
      protected_credit_balance: 0,
      total_balance: 0,
      transferable_balance: 0,
      withdrawable_balance: 0,
      currency: 'USD',
      updated_at: new Date().toISOString(),
    });

    const result = await service.initiateDeposit({
      amount: 100,
      provider: 'mercadopago',
      description: 'Test deposit',
    });

    expect(result.success).toBeTrue();
    expect(result.transaction_id).toBe('tx-1');
    expect(result.payment_url).toContain('https://mercadopago.test');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example-project.supabase.co/functions/v1/mercadopago-create-preference',
      jasmine.objectContaining({
        method: 'POST',
        headers: jasmine.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
  });

  it('fuerza el polling de pagos pendientes', async () => {
    const fetchSpy = jasmine.createSpy('fetch').and.callFake(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          confirmed: 1,
          message: 'Processed',
        }),
      } as any),
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const result = await service.forcePollPendingPayments();

    expect(result.success).toBeTrue();
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example-project.supabase.co/functions/v1/mercadopago-poll-pending-payments',
      jasmine.objectContaining({
        method: 'POST',
        headers: jasmine.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
  });
});
