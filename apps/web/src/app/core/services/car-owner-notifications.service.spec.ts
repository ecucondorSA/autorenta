import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from './supabase-client.service';
import { CarOwnerNotificationsService } from './car-owner-notifications.service';

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

describe('CarOwnerNotificationsService', () => {
  let service: CarOwnerNotificationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CarOwnerNotificationsService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(CarOwnerNotificationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have checkAndNotifyMissingDocumentsForAllCars method', () => {
    expect(typeof service.checkAndNotifyMissingDocumentsForAllCars).toBe('function');
  });

  it('should have notifyNewChatMessage method', () => {
    expect(typeof service.notifyNewChatMessage).toBe('function');
  });

  it('should have notifyNewBookingRequest method', () => {
    expect(typeof service.notifyNewBookingRequest).toBe('function');
  });

  it('should have notifyCarViews method', () => {
    expect(typeof service.notifyCarViews).toBe('function');
  });

  it('should have notifyBookingConfirmed method', () => {
    expect(typeof service.notifyBookingConfirmed).toBe('function');
  });

  it('should have notifyPaymentReceived method', () => {
    expect(typeof service.notifyPaymentReceived).toBe('function');
  });

  it('should have notifyNewReview method', () => {
    expect(typeof service.notifyNewReview).toBe('function');
  });

  it('should have notifyBookingCancelled method', () => {
    expect(typeof service.notifyBookingCancelled).toBe('function');
  });

  it('should have notifyCarNeedsAttention method', () => {
    expect(typeof service.notifyCarNeedsAttention).toBe('function');
  });

  it('should have notifyAchievement method', () => {
    expect(typeof service.notifyAchievement).toBe('function');
  });

});
