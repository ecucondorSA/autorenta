import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { NotificationsService } from '@core/services/infrastructure/user-notifications.service';

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

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NotificationsService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },
      ],
    });
    service = TestBed.inject(NotificationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have refresh method', () => {
    expect(typeof service.refresh).toBe('function');
  });

  it('should have loadNotifications method', () => {
    expect(typeof service.loadNotifications).toBe('function');
  });

  it('should have reconnect method', () => {
    expect(typeof service.reconnect).toBe('function');
  });

  it('should have markAsRead method', () => {
    expect(typeof service.markAsRead).toBe('function');
  });

  it('should have markAllAsRead method', () => {
    expect(typeof service.markAllAsRead).toBe('function');
  });

  it('should have requestNotificationPermission method', () => {
    expect(typeof service.requestNotificationPermission).toBe('function');
  });

  it('should have createNotification method', () => {
    expect(typeof service.createNotification).toBe('function');
  });

  it('should have notifyNewBookingForOwner method', () => {
    expect(typeof service.notifyNewBookingForOwner).toBe('function');
  });

  it('should have notifyBookingCreated method', () => {
    expect(typeof service.notifyBookingCreated).toBe('function');
  });

  it('should have notifyBookingCancelledForOwner method', () => {
    expect(typeof service.notifyBookingCancelledForOwner).toBe('function');
  });
});
