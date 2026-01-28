import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { SettlementService } from '@core/services/payments/settlement.service';
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

describe('SettlementService', () => {
  let service: SettlementService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, SettlementService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },],
    });
    service = TestBed.inject(SettlementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have validateInspections method', () => {
    expect(typeof service.validateInspections).toBe('function');
  });

  it('should have compareDamages method', () => {
    expect(typeof service.compareDamages).toBe('function');
  });

  it('should have createClaim method', () => {
    expect(typeof service.createClaim).toBe('function');
  });

  it('should have evaluateClaim method', () => {
    expect(typeof service.evaluateClaim).toBe('function');
  });

  it('should have processClaim method', () => {
    expect(typeof service.processClaim).toBe('function');
  });

  it('should have simulateWaterfall method', () => {
    expect(typeof service.simulateWaterfall).toBe('function');
  });

  it('should have estimateDamageCost method', () => {
    expect(typeof service.estimateDamageCost).toBe('function');
  });

  it('should have formatBreakdown method', () => {
    expect(typeof service.formatBreakdown).toBe('function');
  });

  it('should have clearState method', () => {
    expect(typeof service.clearState).toBe('function');
  });

  it('should have getState method', () => {
    expect(typeof service.getState).toBe('function');
  });
});
