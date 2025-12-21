import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { WalletService } from '@core/services/payments/wallet.service';

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
    getSession: jasmine.createSpy('getSession').and.returnValue(Promise.resolve({ data: { session: null }, error: null })),
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
  from: mockSupabaseClient.from,
  rpc: mockSupabaseClient.rpc,
  auth: mockSupabaseClient.auth,
  storage: mockSupabaseClient.storage,
};

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WalletService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(WalletService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have fetchBalance method', () => {
    expect(typeof service.fetchBalance).toBe('function');
  });

  it('should have fetchTransactions method', () => {
    expect(typeof service.fetchTransactions).toBe('function');
  });

  it('should have refreshBalanceAsync method', () => {
    expect(typeof service.refreshBalanceAsync).toBe('function');
  });

  it('should have createDepositPreference method', () => {
    expect(typeof service.createDepositPreference).toBe('function');
  });

  it('should have depositFunds method', () => {
    expect(typeof service.depositFunds).toBe('function');
  });

  it('should have subscribeToWalletChanges method', () => {
    expect(typeof service.subscribeToWalletChanges).toBe('function');
  });

  it('should have unsubscribeFromWalletChanges method', () => {
    expect(typeof service.unsubscribeFromWalletChanges).toBe('function');
  });

  it('should have forcePollPendingPayments method', () => {
    expect(typeof service.forcePollPendingPayments).toBe('function');
  });

  it('should have refreshPendingDepositsCount method', () => {
    expect(typeof service.refreshPendingDepositsCount).toBe('function');
  });

  it('should have issueProtectionCredit method', () => {
    expect(typeof service.issueProtectionCredit).toBe('function');
  });

});
