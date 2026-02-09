import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { PlatformConfigService } from '@core/services/infrastructure/platform-config.service';
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

describe('PlatformConfigService', () => {
  let service: PlatformConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...testProviders,
        PlatformConfigService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },
      ],
    });
    service = TestBed.inject(PlatformConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have loadPublicConfig method', () => {
    expect(typeof service.loadPublicConfig).toBe('function');
  });

  it('should have refresh method', () => {
    expect(typeof service.refresh).toBe('function');
  });

  it('should have getNumber method', () => {
    expect(typeof service.getNumber).toBe('function');
  });

  it('should have getString method', () => {
    expect(typeof service.getString).toBe('function');
  });

  it('should have getBoolean method', () => {
    expect(typeof service.getBoolean).toBe('function');
  });

  it('should have getByCategory method', () => {
    expect(typeof service.getByCategory).toBe('function');
  });

  it('should have isFeatureEnabled method', () => {
    expect(typeof service.isFeatureEnabled).toBe('function');
  });

  it('should have getDepositForPaymentMethod method', () => {
    expect(typeof service.getDepositForPaymentMethod).toBe('function');
  });

  it('should have getDepositCents method', () => {
    expect(typeof service.getDepositCents).toBe('function');
  });

  it('should have getServiceFeePercent method', () => {
    expect(typeof service.getServiceFeePercent).toBe('function');
  });
});
