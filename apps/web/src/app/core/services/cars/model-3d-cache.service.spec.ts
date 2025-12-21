import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { Model3DCacheService } from './model-3d-cache.service';

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

describe('Model3DCacheService', () => {
  let service: Model3DCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [Model3DCacheService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(Model3DCacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have hasModel method', () => {
    expect(typeof service.hasModel).toBe('function');
  });

  it('should have getCachedModel method', () => {
    expect(typeof service.getCachedModel).toBe('function');
  });

  it('should have getOriginalModel method', () => {
    expect(typeof service.getOriginalModel).toBe('function');
  });

  it('should have cacheModel method', () => {
    expect(typeof service.cacheModel).toBe('function');
  });

  it('should have prepareForCache method', () => {
    expect(typeof service.prepareForCache).toBe('function');
  });

  it('should have clearModel method', () => {
    expect(typeof service.clearModel).toBe('function');
  });

  it('should have clearCache method', () => {
    expect(typeof service.clearCache).toBe('function');
  });

  it('should have getStats method', () => {
    expect(typeof service.getStats).toBe('function');
  });

});
