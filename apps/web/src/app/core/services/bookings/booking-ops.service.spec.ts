import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { BookingOpsService } from './booking-ops.service';

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

describe('BookingOpsService', () => {
  let service: BookingOpsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BookingOpsService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(BookingOpsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getPricing method', () => {
    expect(typeof service.getPricing).toBe('function');
  });

  it('should have getInsurance method', () => {
    expect(typeof service.getInsurance).toBe('function');
  });

  it('should have getTrackingSession method', () => {
    expect(typeof service.getTrackingSession).toBe('function');
  });

  it('should have countTrackingPoints method', () => {
    expect(typeof service.countTrackingPoints).toBe('function');
  });

  it('should have getConfirmation method', () => {
    expect(typeof service.getConfirmation).toBe('function');
  });

  it('should have getCancellation method', () => {
    expect(typeof service.getCancellation).toBe('function');
  });

  it('should have getPayment method', () => {
    expect(typeof service.getPayment).toBe('function');
  });

});
