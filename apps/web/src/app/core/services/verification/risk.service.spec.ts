import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { RiskService } from '@core/services/verification/risk.service';
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

describe('RiskService', () => {
  let service: RiskService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, RiskService, { provide: SupabaseClientService, useValue: mockSupabaseService }],
    });
    service = TestBed.inject(RiskService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have calculateRiskSnapshot method', () => {
    expect(typeof service.calculateRiskSnapshot).toBe('function');
  });

  it('should have persistRiskSnapshot method', () => {
    expect(typeof service.persistRiskSnapshot).toBe('function');
  });

  it('should have getRiskSnapshotByBookingId method', () => {
    expect(typeof service.getRiskSnapshotByBookingId).toBe('function');
  });

  it('should have recalculateWithUpgrade method', () => {
    expect(typeof service.recalculateWithUpgrade).toBe('function');
  });

  it('should have recalculateWithNewFxRate method', () => {
    expect(typeof service.recalculateWithNewFxRate).toBe('function');
  });

  it('should have validateRiskSnapshot method', () => {
    expect(typeof service.validateRiskSnapshot).toBe('function');
  });
});
