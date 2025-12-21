import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from './supabase-client.service';
import { MessagesService } from './messages.service';

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

describe('MessagesService', () => {
  let service: MessagesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MessagesService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(MessagesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have listByBooking method', () => {
    expect(typeof service.listByBooking).toBe('function');
  });

  it('should have listByCar method', () => {
    expect(typeof service.listByCar).toBe('function');
  });

  it('should have listCarLeadsForOwner method', () => {
    expect(typeof service.listCarLeadsForOwner).toBe('function');
  });

  it('should have sendMessage method', () => {
    expect(typeof service.sendMessage).toBe('function');
  });

  it('should have markAsRead method', () => {
    expect(typeof service.markAsRead).toBe('function');
  });

  it('should have markAsDelivered method', () => {
    expect(typeof service.markAsDelivered).toBe('function');
  });

  it('should have setTyping method', () => {
    expect(typeof service.setTyping).toBe('function');
  });

  it('should have listConversations method', () => {
    expect(typeof service.listConversations).toBe('function');
  });

  it('should have markConversationRead method', () => {
    expect(typeof service.markConversationRead).toBe('function');
  });

  it('should have blockUser method', () => {
    expect(typeof service.blockUser).toBe('function');
  });

});
