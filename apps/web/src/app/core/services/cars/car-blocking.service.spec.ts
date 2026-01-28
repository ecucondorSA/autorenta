import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { CarBlockingService } from '@core/services/cars/car-blocking.service';
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

describe('CarBlockingService', () => {
  let service: CarBlockingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, CarBlockingService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },],
    });
    service = TestBed.inject(CarBlockingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have blockDates method', () => {
    expect(typeof service.blockDates).toBe('function');
  });

  it('should have bulkBlockDates method', () => {
    expect(typeof service.bulkBlockDates).toBe('function');
  });

  it('should have unblockById method', () => {
    expect(typeof service.unblockById).toBe('function');
  });

  it('should have getBlockedDates method', () => {
    expect(typeof service.getBlockedDates).toBe('function');
  });

  it('should have getBlockedDatesForCars method', () => {
    expect(typeof service.getBlockedDatesForCars).toBe('function');
  });

  it('should have clearAllBlocks method', () => {
    expect(typeof service.clearAllBlocks).toBe('function');
  });

  it('should have clearCache method', () => {
    expect(typeof service.clearCache).toBe('function');
  });

  it('should have convertBlocksToDateArray method', () => {
    expect(typeof service.convertBlocksToDateArray).toBe('function');
  });
});
