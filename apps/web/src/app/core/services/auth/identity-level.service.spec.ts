import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { IdentityLevelService } from '@core/services/verification/identity-level.service';
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

describe('IdentityLevelService', () => {
  let service: IdentityLevelService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, IdentityLevelService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },],
    });
    service = TestBed.inject(IdentityLevelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have loadIdentityLevel method', () => {
    expect(typeof service.loadIdentityLevel).toBe('function');
  });

  it('should have getVerificationProgress method', () => {
    expect(typeof service.getVerificationProgress).toBe('function');
  });

  it('should have checkLevelAccess method', () => {
    expect(typeof service.checkLevelAccess).toBe('function');
  });

  it('should have updateIdentityLevel method', () => {
    expect(typeof service.updateIdentityLevel).toBe('function');
  });

  it('should have getCurrentLevel method', () => {
    expect(typeof service.getCurrentLevel).toBe('function');
  });

  it('should have canPublishCars method', () => {
    expect(typeof service.canPublishCars).toBe('function');
  });

  it('should have canBookExpensiveCars method', () => {
    expect(typeof service.canBookExpensiveCars).toBe('function');
  });

  it('should have refresh method', () => {
    expect(typeof service.refresh).toBe('function');
  });

  it('should have clearError method', () => {
    expect(typeof service.clearError).toBe('function');
  });
});
