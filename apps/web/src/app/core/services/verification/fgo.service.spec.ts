import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { FgoService } from './fgo.service';

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

describe('FgoService', () => {
  let service: FgoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FgoService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(FgoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getFgoBalance method', () => {
    expect(typeof service.getFgoBalance).toBe('function');
  });

  it('should have getReserveCoefficient method', () => {
    expect(typeof service.getReserveCoefficient).toBe('function');
  });

  it('should have getContributionAlpha method', () => {
    expect(typeof service.getContributionAlpha).toBe('function');
  });

  it('should have addContribution method', () => {
    expect(typeof service.addContribution).toBe('function');
  });

  it('should have addPayout method', () => {
    expect(typeof service.addPayout).toBe('function');
  });

  it('should have addRecovery method', () => {
    expect(typeof service.addRecovery).toBe('function');
  });

});
