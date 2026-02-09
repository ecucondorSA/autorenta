import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { WalletLedgerService } from '@core/services/payments/wallet-ledger.service';
import { testProviders } from '@app/testing/test-providers';

const mockSupabaseClient = {
  from: jasmine.createSpy('from').and.returnValue({
    select: jasmine.createSpy('select').and.returnValue({
      eq: jasmine.createSpy('eq').and.returnValue(Promise.resolve({ data: [], error: null })),
      single: jasmine
        .createSpy('single')
        .and.returnValue(Promise.resolve({ data: null, error: null })),
    }),
    insert: jasmine
      .createSpy('insert')
      .and.returnValue(Promise.resolve({ data: null, error: null })),
    update: jasmine
      .createSpy('update')
      .and.returnValue(Promise.resolve({ data: null, error: null })),
    delete: jasmine
      .createSpy('delete')
      .and.returnValue(Promise.resolve({ data: null, error: null })),
  }),
  rpc: jasmine.createSpy('rpc').and.returnValue(Promise.resolve({ data: null, error: null })),
  auth: {
    getUser: jasmine
      .createSpy('getUser')
      .and.returnValue(Promise.resolve({ data: { user: null }, error: null })),
    getSession: jasmine
      .createSpy('getSession')
      .and.returnValue(Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: jasmine
      .createSpy('onAuthStateChange')
      .and.returnValue({ data: { subscription: { unsubscribe: jasmine.createSpy() } } }),
  },
  storage: {
    from: jasmine.createSpy('from').and.returnValue({
      upload: jasmine
        .createSpy('upload')
        .and.returnValue(Promise.resolve({ data: null, error: null })),
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

describe('WalletLedgerService', () => {
  let service: WalletLedgerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...testProviders,
        WalletLedgerService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },
      ],
    });
    service = TestBed.inject(WalletLedgerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have loadLedgerHistory method', () => {
    expect(typeof service.loadLedgerHistory).toBe('function');
  });

  it('should have loadTransfers method', () => {
    expect(typeof service.loadTransfers).toBe('function');
  });

  it('should have transferFunds method', () => {
    expect(typeof service.transferFunds).toBe('function');
  });

  it('should have searchUserByWalletNumber method', () => {
    expect(typeof service.searchUserByWalletNumber).toBe('function');
  });

  it('should have formatAmount method', () => {
    expect(typeof service.formatAmount).toBe('function');
  });

  it('should have getKindLabel method', () => {
    expect(typeof service.getKindLabel).toBe('function');
  });

  it('should have getKindIcon method', () => {
    expect(typeof service.getKindIcon).toBe('function');
  });

  it('should have getKindColor method', () => {
    expect(typeof service.getKindColor).toBe('function');
  });
});
