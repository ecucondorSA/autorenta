import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { DynamicPricingService } from './dynamic-pricing.service';

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

describe('DynamicPricingService', () => {
  let service: DynamicPricingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DynamicPricingService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(DynamicPricingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getRegions method', () => {
    expect(typeof service.getRegions).toBe('function');
  });

  it('should have getRegionById method', () => {
    expect(typeof service.getRegionById).toBe('function');
  });

  it('should have calculatePrice method', () => {
    expect(typeof service.calculatePrice).toBe('function');
  });

  it('should have calculatePriceRPC method', () => {
    expect(typeof service.calculatePriceRPC).toBe('function');
  });

  it('should have calculateBatchPricesRPC method', () => {
    expect(typeof service.calculateBatchPricesRPC).toBe('function');
  });

  it('should have getLatestDemand method', () => {
    expect(typeof service.getLatestDemand).toBe('function');
  });

  it('should have getActiveEvents method', () => {
    expect(typeof service.getActiveEvents).toBe('function');
  });

  it('should have getUserPricingHistory method', () => {
    expect(typeof service.getUserPricingHistory).toBe('function');
  });

  it('should have getQuickPrice method', () => {
    expect(typeof service.getQuickPrice).toBe('function');
  });

  it('should have getBatchPrices method', () => {
    expect(typeof service.getBatchPrices).toBe('function');
  });

});
