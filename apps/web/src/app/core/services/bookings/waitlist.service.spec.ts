import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { WaitlistService } from '@core/services/bookings/waitlist.service';
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

describe('WaitlistService', () => {
  let service: WaitlistService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, WaitlistService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },],
    });
    service = TestBed.inject(WaitlistService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have addToWaitlist method', () => {
    expect(typeof service.addToWaitlist).toBe('function');
  });

  it('should have removeFromWaitlist method', () => {
    expect(typeof service.removeFromWaitlist).toBe('function');
  });

  it('should have getMyWaitlist method', () => {
    expect(typeof service.getMyWaitlist).toBe('function');
  });

  it('should have getWaitlistCount method', () => {
    expect(typeof service.getWaitlistCount).toBe('function');
  });
});
