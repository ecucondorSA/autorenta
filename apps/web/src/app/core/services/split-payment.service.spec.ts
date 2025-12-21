import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from './supabase-client.service';
import { SplitPaymentService } from './split-payment.service';

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

describe('SplitPaymentService', () => {
  let service: SplitPaymentService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SplitPaymentService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(SplitPaymentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have processSplitPayment method', () => {
    expect(typeof service.processSplitPayment).toBe('function');
  });

  it('should have getBookingSplits method', () => {
    expect(typeof service.getBookingSplits).toBe('function');
  });

  it('should have getUserSplits method', () => {
    expect(typeof service.getUserSplits).toBe('function');
  });

  it('should have getUserSplitStats method', () => {
    expect(typeof service.getUserSplitStats).toBe('function');
  });

  it('should have completeSplit method', () => {
    expect(typeof service.completeSplit).toBe('function');
  });

  it('should have failSplit method', () => {
    expect(typeof service.failSplit).toBe('function');
  });

  it('should have getPaymentBreakdown method', () => {
    expect(typeof service.getPaymentBreakdown).toBe('function');
  });

});
