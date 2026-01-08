import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { InsuranceService } from '@core/services/bookings/insurance.service';

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

describe('InsuranceService', () => {
  let service: InsuranceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InsuranceService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },
      ],
    });
    service = TestBed.inject(InsuranceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have registerOwnerPolicy method', () => {
    expect(typeof service.registerOwnerPolicy).toBe('function');
  });

  it('should have verifyOwnerPolicy method', () => {
    expect(typeof service.verifyOwnerPolicy).toBe('function');
  });

  it('should have activateCoverage method', () => {
    expect(typeof service.activateCoverage).toBe('function');
  });

  it('should have getInsuranceSummary method', () => {
    expect(typeof service.getInsuranceSummary).toBe('function');
  });

  it('should have uploadClaimEvidence method', () => {
    expect(typeof service.uploadClaimEvidence).toBe('function');
  });

  it('should have reportClaim method', () => {
    expect(typeof service.reportClaim).toBe('function');
  });

  it('should have updateClaimStatus method', () => {
    expect(typeof service.updateClaimStatus).toBe('function');
  });

  it('should have createInspection method', () => {
    expect(typeof service.createInspection).toBe('function');
  });

  it('should have compareInspections method', () => {
    expect(typeof service.compareInspections).toBe('function');
  });

  it('should have calculateSecurityDeposit method', () => {
    expect(typeof service.calculateSecurityDeposit).toBe('function');
  });
});
