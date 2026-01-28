import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { AutorentarCreditService } from '@core/services/payments/autorentar-credit.service';
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

describe('AutorentarCreditService', () => {
  let service: AutorentarCreditService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, AutorentarCreditService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },],
    });
    service = TestBed.inject(AutorentarCreditService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getCreditInfo method', () => {
    expect(typeof service.getCreditInfo).toBe('function');
  });

  it('should have issueCredit method', () => {
    expect(typeof service.issueCredit).toBe('function');
  });

  it('should have consumeCredit method', () => {
    expect(typeof service.consumeCredit).toBe('function');
  });

  it('should have extendCredit method', () => {
    expect(typeof service.extendCredit).toBe('function');
  });

  it('should have checkRenewalEligibility method', () => {
    expect(typeof service.checkRenewalEligibility).toBe('function');
  });

  it('should have recognizeBreakage method', () => {
    expect(typeof service.recognizeBreakage).toBe('function');
  });

  it('should have refresh method', () => {
    expect(typeof service.refresh).toBe('function');
  });

  it('should have formatBalance method', () => {
    expect(typeof service.formatBalance).toBe('function');
  });

  it('should have formatExpirationDate method', () => {
    expect(typeof service.formatExpirationDate).toBe('function');
  });
});
