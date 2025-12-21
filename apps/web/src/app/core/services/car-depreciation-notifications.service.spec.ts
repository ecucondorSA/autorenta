import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from './supabase-client.service';
import { CarDepreciationNotificationsService } from './car-depreciation-notifications.service';

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

describe('CarDepreciationNotificationsService', () => {
  let service: CarDepreciationNotificationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CarDepreciationNotificationsService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(CarDepreciationNotificationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have calculateMonthlyDepreciation method', () => {
    expect(typeof service.calculateMonthlyDepreciation).toBe('function');
  });

  it('should have calculateMonthlyEarnings method', () => {
    expect(typeof service.calculateMonthlyEarnings).toBe('function');
  });

  it('should have sendMonthlyDepreciationNotification method', () => {
    expect(typeof service.sendMonthlyDepreciationNotification).toBe('function');
  });

  it('should have sendMonthlyNotificationsForAllCars method', () => {
    expect(typeof service.sendMonthlyNotificationsForAllCars).toBe('function');
  });

  it('should have sendEarningTipsNotification method', () => {
    expect(typeof service.sendEarningTipsNotification).toBe('function');
  });

});
