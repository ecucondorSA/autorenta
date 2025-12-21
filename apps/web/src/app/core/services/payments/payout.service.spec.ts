import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { PayoutService } from './payout.service';

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

describe('PayoutService', () => {
  let service: PayoutService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PayoutService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(PayoutService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have initiatePayout method', () => {
    expect(typeof service.initiatePayout).toBe('function');
  });

  it('should have getUserPayouts method', () => {
    expect(typeof service.getUserPayouts).toBe('function');
  });

  it('should have getUserPayoutsPaginated method', () => {
    expect(typeof service.getUserPayoutsPaginated).toBe('function');
  });

  it('should have getPayoutStatus method', () => {
    expect(typeof service.getPayoutStatus).toBe('function');
  });

  it('should have getDefaultBankAccount method', () => {
    expect(typeof service.getDefaultBankAccount).toBe('function');
  });

  it('should have getUserBankAccounts method', () => {
    expect(typeof service.getUserBankAccounts).toBe('function');
  });

  it('should have addBankAccount method', () => {
    expect(typeof service.addBankAccount).toBe('function');
  });

  it('should have setDefaultBankAccount method', () => {
    expect(typeof service.setDefaultBankAccount).toBe('function');
  });

  it('should have monitorPayoutStatus method', () => {
    expect(typeof service.monitorPayoutStatus).toBe('function');
  });

  it('should have getPayoutStats method', () => {
    expect(typeof service.getPayoutStats).toBe('function');
  });

});
