import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { BookingWalletService } from '@core/services/bookings/booking-wallet.service';
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

describe('BookingWalletService', () => {
  let service: BookingWalletService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...testProviders,
        BookingWalletService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },
      ],
    });
    service = TestBed.inject(BookingWalletService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have chargeRentalFromWallet method', () => {
    expect(typeof service.chargeRentalFromWallet).toBe('function');
  });

  it('should have processRentalPayment method', () => {
    expect(typeof service.processRentalPayment).toBe('function');
  });

  it('should have lockSecurityDeposit method', () => {
    expect(typeof service.lockSecurityDeposit).toBe('function');
  });

  it('should have releaseSecurityDeposit method', () => {
    expect(typeof service.releaseSecurityDeposit).toBe('function');
  });

  it('should have deductFromSecurityDeposit method', () => {
    expect(typeof service.deductFromSecurityDeposit).toBe('function');
  });

  it('should have unlockFundsForCancellation method', () => {
    expect(typeof service.unlockFundsForCancellation).toBe('function');
  });
});
