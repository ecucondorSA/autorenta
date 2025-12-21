import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { WithdrawalService } from '@core/services/payments/withdrawal.service';

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

describe('WithdrawalService', () => {
  let service: WithdrawalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WithdrawalService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(WithdrawalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getBankAccounts method', () => {
    expect(typeof service.getBankAccounts).toBe('function');
  });

  it('should have addBankAccount method', () => {
    expect(typeof service.addBankAccount).toBe('function');
  });

  it('should have setDefaultBankAccount method', () => {
    expect(typeof service.setDefaultBankAccount).toBe('function');
  });

  it('should have deleteBankAccount method', () => {
    expect(typeof service.deleteBankAccount).toBe('function');
  });

  it('should have requestWithdrawal method', () => {
    expect(typeof service.requestWithdrawal).toBe('function');
  });

  it('should have getWithdrawalRequests method', () => {
    expect(typeof service.getWithdrawalRequests).toBe('function');
  });

  it('should have getAllWithdrawals method', () => {
    expect(typeof service.getAllWithdrawals).toBe('function');
  });

  it('should have cancelWithdrawalRequest method', () => {
    expect(typeof service.cancelWithdrawalRequest).toBe('function');
  });

  it('should have approveWithdrawal method', () => {
    expect(typeof service.approveWithdrawal).toBe('function');
  });

  it('should have rejectWithdrawal method', () => {
    expect(typeof service.rejectWithdrawal).toBe('function');
  });

});
