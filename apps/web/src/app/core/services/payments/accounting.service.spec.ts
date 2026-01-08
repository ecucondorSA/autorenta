import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { AccountingService } from '@core/services/payments/accounting.service';

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

describe('AccountingService', () => {
  let service: AccountingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AccountingService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },
      ],
    });
    service = TestBed.inject(AccountingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getDashboard method', () => {
    expect(typeof service.getDashboard).toBe('function');
  });

  it('should have getBalanceSheet method', () => {
    expect(typeof service.getBalanceSheet).toBe('function');
  });

  it('should have getIncomeStatement method', () => {
    expect(typeof service.getIncomeStatement).toBe('function');
  });

  it('should have getActiveProvisions method', () => {
    expect(typeof service.getActiveProvisions).toBe('function');
  });

  it('should have getWalletReconciliation method', () => {
    expect(typeof service.getWalletReconciliation).toBe('function');
  });

  it('should have getCommissionsReport method', () => {
    expect(typeof service.getCommissionsReport).toBe('function');
  });

  it('should have getChartOfAccounts method', () => {
    expect(typeof service.getChartOfAccounts).toBe('function');
  });

  it('should have getLedger method', () => {
    expect(typeof service.getLedger).toBe('function');
  });

  it('should have getCashFlow method', () => {
    expect(typeof service.getCashFlow).toBe('function');
  });

  it('should have refreshBalances method', () => {
    expect(typeof service.refreshBalances).toBe('function');
  });
});
