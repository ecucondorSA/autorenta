import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { PaymentsService } from '@core/services/payments/payments.service';
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

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, PaymentsService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },],
    });
    service = TestBed.inject(PaymentsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have createIntent method', () => {
    expect(typeof service.createIntent).toBe('function');
  });

  it('should have createPaymentIntent method', () => {
    expect(typeof service.createPaymentIntent).toBe('function');
  });

  it('should have createMpPreAuthOrder method', () => {
    expect(typeof service.createMpPreAuthOrder).toBe('function');
  });

  it('should have markAsPaid method', () => {
    expect(typeof service.markAsPaid).toBe('function');
  });

  it('should have getStatus method', () => {
    expect(typeof service.getStatus).toBe('function');
  });

  it('should have triggerMockPayment method', () => {
    expect(typeof service.triggerMockPayment).toBe('function');
  });

  it('should have createPaymentIntentWithDetails method', () => {
    expect(typeof service.createPaymentIntentWithDetails).toBe('function');
  });

  it('should have simulateWebhook method', () => {
    expect(typeof service.simulateWebhook).toBe('function');
  });

  it('should have captureMpPreAuth method', () => {
    expect(typeof service.captureMpPreAuth).toBe('function');
  });

  it('should have releaseMpPreAuth method', () => {
    expect(typeof service.releaseMpPreAuth).toBe('function');
  });
});
