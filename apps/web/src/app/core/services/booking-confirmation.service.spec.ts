import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from './supabase-client.service';
import { BookingConfirmationService } from './booking-confirmation.service';

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

describe('BookingConfirmationService', () => {
  let service: BookingConfirmationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BookingConfirmationService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(BookingConfirmationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have markAsReturned method', () => {
    expect(typeof service.markAsReturned).toBe('function');
  });

  it('should have confirmOwner method', () => {
    expect(typeof service.confirmOwner).toBe('function');
  });

  it('should have confirmRenter method', () => {
    expect(typeof service.confirmRenter).toBe('function');
  });

  it('should have clear method', () => {
    expect(typeof service.clear).toBe('function');
  });

});
