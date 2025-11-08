import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { WalletBalance } from '../models/wallet.model';
import { makeSupabaseMock } from '../../../test-helpers/supabase.mock';
import { VALID_UUID } from '../../../test-helpers/factories';
import { SupabaseClientService } from './supabase-client.service';
import { WalletService } from './wallet.service';

describe('WalletService', () => {
  let service: WalletService;
  let supabaseMock: any;
  let rpcHandlers: Record<string, () => Promise<{ data: unknown; error: unknown }>>;
  let originalSupabaseUrl: string;
  const originalFetch = globalThis.fetch;
  const defaultBalance: WalletBalance = {
    user_id: VALID_UUID,
    available_balance: 0,
    locked_balance: 0,
    protected_credit_balance: 0,
    autorentar_credit_balance: 0,
    cash_deposit_balance: 0,
    total_balance: 0,
    transferable_balance: 0,
    withdrawable_balance: 0,
    currency: 'USD',
  };

  beforeEach(() => {
    originalSupabaseUrl = environment.supabaseUrl;
    environment.supabaseUrl = 'https://example-project.supabase.co';

    rpcHandlers = {};

    supabaseMock = makeSupabaseMock();
    supabaseMock.rpc.and.callFake((fn: string) => {
      if (fn === 'wallet_get_balance') {
        return Promise.resolve({
          data: [defaultBalance],
          error: null,
        });
      }
      const handler = rpcHandlers[fn];
      if (handler) {
        return handler();
      }
      return Promise.resolve({ data: null, error: null });
    });

    const supabaseServiceMock = {
      getClient: () => supabaseMock,
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
            payment_url: 'https://mercadopago.test/init',
          },
        ],
        error: null,
      });

    const result = await firstValueFrom(
      service.initiateDeposit({
        amount: 100,
        provider: 'mercadopago',
        description: 'Test deposit',
      }),
    );

    expect(result.success).toBeTrue();
    expect(result.transaction_id).toBe('tx-1');
    expect(result.payment_url).toContain('https://mercadopago.test');
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith(
      'mercadopago-create-preference',
      jasmine.objectContaining({
        body: jasmine.objectContaining({
          transaction_id: 'tx-1',
          amount: 100,
        }),
      }),
    );
  });

  it('fuerza el polling de pagos pendientes', async () => {
    rpcHandlers['wallet_poll_pending_payments'] = () =>
      Promise.resolve({
        data: { success: true, confirmed: 1, message: 'Processed' },
        error: null,
      });

    const result = await service.forcePollPendingPayments();

    expect(result.success).toBeTrue();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('wallet_poll_pending_payments');
  });
});
