import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { FgoV1_1Service } from '@core/services/verification/fgo-v1-1.service';
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
  getClient: () => mockSupabaseClient,
  from: mockSupabaseClient.from,
  rpc: mockSupabaseClient.rpc,
  auth: mockSupabaseClient.auth,
  storage: mockSupabaseClient.storage,
};

describe('FgoV1_1Service', () => {
  let service: FgoV1_1Service;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...testProviders,
        FgoV1_1Service,
        { provide: SupabaseClientService, useValue: mockSupabaseService },
      ],
    });
    service = TestBed.inject(FgoV1_1Service);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have isAdmin method', () => {
    expect(typeof service.isAdmin).toBe('function');
  });

  it('should have getCurrentUserId method', () => {
    expect(typeof service.getCurrentUserId).toBe('function');
  });

  it('should have getParameters method', () => {
    expect(typeof service.getParameters).toBe('function');
  });

  it('should have getAllParameters method', () => {
    expect(typeof service.getAllParameters).toBe('function');
  });

  it('should have updateParameters method', () => {
    expect(typeof service.updateParameters).toBe('function');
  });

  it('should have createRiskSnapshot method', () => {
    expect(typeof service.createRiskSnapshot).toBe('function');
  });

  it('should have getRiskSnapshot method', () => {
    expect(typeof service.getRiskSnapshot).toBe('function');
  });

  it('should have createInspection method', () => {
    expect(typeof service.createInspection).toBe('function');
  });

  it('should have signInspection method', () => {
    expect(typeof service.signInspection).toBe('function');
  });

  it('should have getInspections method', () => {
    expect(typeof service.getInspections).toBe('function');
  });
});
