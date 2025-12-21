import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { FeatureFlagService } from '@core/services/infrastructure/feature-flag.service';

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

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FeatureFlagService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(FeatureFlagService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have loadFlags method', () => {
    expect(typeof service.loadFlags).toBe('function');
  });

  it('should have loadOverrides method', () => {
    expect(typeof service.loadOverrides).toBe('function');
  });

  it('should have getAllFlags method', () => {
    expect(typeof service.getAllFlags).toBe('function');
  });

  it('should have createFlag method', () => {
    expect(typeof service.createFlag).toBe('function');
  });

  it('should have updateFlag method', () => {
    expect(typeof service.updateFlag).toBe('function');
  });

  it('should have deleteFlag method', () => {
    expect(typeof service.deleteFlag).toBe('function');
  });

  it('should have toggleFlag method', () => {
    expect(typeof service.toggleFlag).toBe('function');
  });

  it('should have createOverride method', () => {
    expect(typeof service.createOverride).toBe('function');
  });

  it('should have deleteOverride method', () => {
    expect(typeof service.deleteOverride).toBe('function');
  });

  it('should have getAuditLog method', () => {
    expect(typeof service.getAuditLog).toBe('function');
  });

});
