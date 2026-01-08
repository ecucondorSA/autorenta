import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { MercadoPagoOAuthService } from '@core/services/payments/mercadopago-oauth.service';

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

describe('MercadoPagoOAuthService', () => {
  let service: MercadoPagoOAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MercadoPagoOAuthService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },
      ],
    });
    service = TestBed.inject(MercadoPagoOAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have connectMercadoPago method', () => {
    expect(typeof service.connectMercadoPago).toBe('function');
  });

  it('should have handleCallback method', () => {
    expect(typeof service.handleCallback).toBe('function');
  });

  it('should have checkConnection method', () => {
    expect(typeof service.checkConnection).toBe('function');
  });

  it('should have disconnect method', () => {
    expect(typeof service.disconnect).toBe('function');
  });

  it('should have getProfile method', () => {
    expect(typeof service.getProfile).toBe('function');
  });

  it('should have canPublishCars method', () => {
    expect(typeof service.canPublishCars).toBe('function');
  });

  it('should have navigateToConnect method', () => {
    expect(typeof service.navigateToConnect).toBe('function');
  });

  it('should have navigateToProfile method', () => {
    expect(typeof service.navigateToProfile).toBe('function');
  });
});
