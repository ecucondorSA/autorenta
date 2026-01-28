import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { DisputesService } from '@core/services/admin/disputes.service';
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

describe('DisputesService', () => {
  let service: DisputesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, DisputesService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },],
    });
    service = TestBed.inject(DisputesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have listByBooking method', () => {
    expect(typeof service.listByBooking).toBe('function');
  });

  it('should have createDispute method', () => {
    expect(typeof service.createDispute).toBe('function');
  });

  it('should have addEvidence method', () => {
    expect(typeof service.addEvidence).toBe('function');
  });

  it('should have listEvidence method', () => {
    expect(typeof service.listEvidence).toBe('function');
  });

  it('should have getDisputeById method', () => {
    expect(typeof service.getDisputeById).toBe('function');
  });

  it('should have updateStatus method', () => {
    expect(typeof service.updateStatus).toBe('function');
  });

  it('should have resolveDispute method', () => {
    expect(typeof service.resolveDispute).toBe('function');
  });

  it('should have openDisputeRpc method', () => {
    expect(typeof service.openDisputeRpc).toBe('function');
  });

  it('should have resolveDisputeRpc method', () => {
    expect(typeof service.resolveDisputeRpc).toBe('function');
  });

  it('should have getDisputeDetails method', () => {
    expect(typeof service.getDisputeDetails).toBe('function');
  });
});
