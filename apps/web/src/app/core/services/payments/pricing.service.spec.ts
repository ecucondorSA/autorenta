import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { PricingService } from '@core/services/payments/pricing.service';

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

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PricingService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },
      ],
    });
    service = TestBed.inject(PricingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have quoteBooking method', () => {
    expect(typeof service.quoteBooking).toBe('function');
  });

  it('should have calculateDeliveryFee method', () => {
    expect(typeof service.calculateDeliveryFee).toBe('function');
  });

  it('should have cancelWithFee method', () => {
    expect(typeof service.cancelWithFee).toBe('function');
  });

  it('should have getVehicleCategories method', () => {
    expect(typeof service.getVehicleCategories).toBe('function');
  });

  it('should have estimateVehicleValue method', () => {
    expect(typeof service.estimateVehicleValue).toBe('function');
  });

  it('should have getFipeValueRealtime method', () => {
    expect(typeof service.getFipeValueRealtime).toBe('function');
  });

  it('should have calculateSuggestedRate method', () => {
    expect(typeof service.calculateSuggestedRate).toBe('function');
  });

  it('should have getFipeBrands method', () => {
    expect(typeof service.getFipeBrands).toBe('function');
  });

  it('should have getFipeModels method', () => {
    expect(typeof service.getFipeModels).toBe('function');
  });

  it('should have getFipeBaseModels method', () => {
    expect(typeof service.getFipeBaseModels).toBe('function');
  });
});
