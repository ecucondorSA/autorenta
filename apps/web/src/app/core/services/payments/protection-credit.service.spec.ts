import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { ProtectionCreditService } from '@core/services/payments/protection-credit.service';
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

describe('ProtectionCreditService', () => {
  let service: ProtectionCreditService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...testProviders,
        ProtectionCreditService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },
      ],
    });
    service = TestBed.inject(ProtectionCreditService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have loadBalance method', () => {
    expect(typeof service.loadBalance).toBe('function');
  });

  it('should have checkRenewalEligibility method', () => {
    expect(typeof service.checkRenewalEligibility).toBe('function');
  });

  it('should have getRenewalProgress method', () => {
    expect(typeof service.getRenewalProgress).toBe('function');
  });

  it('should have getFormattedBalance method', () => {
    expect(typeof service.getFormattedBalance).toBe('function');
  });

  it('should have getFormattedExpiry method', () => {
    expect(typeof service.getFormattedExpiry).toBe('function');
  });

  it('should have getDaysRemainingText method', () => {
    expect(typeof service.getDaysRemainingText).toBe('function');
  });

  it('should have getStatusBadgeColor method', () => {
    expect(typeof service.getStatusBadgeColor).toBe('function');
  });

  it('should have getUsagePercentage method', () => {
    expect(typeof service.getUsagePercentage).toBe('function');
  });

  it('should have calculateCoverage method', () => {
    expect(typeof service.calculateCoverage).toBe('function');
  });

  it('should have getInfoMessage method', () => {
    expect(typeof service.getInfoMessage).toBe('function');
  });
});
