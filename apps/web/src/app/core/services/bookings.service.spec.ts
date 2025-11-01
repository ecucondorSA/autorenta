import { TestBed } from '@angular/core/testing';
import { BookingsService } from './bookings.service';
import { SupabaseClientService } from './supabase-client.service';
import { WalletService } from './wallet.service';
import { PwaService } from './pwa.service';
import { InsuranceService } from './insurance.service';

describe('BookingsService', () => {
  let service: BookingsService;
  let rpcHandlers: Record<string, () => Promise<{ data: unknown; error: unknown }>>;
  let rpcSpy: jasmine.Spy;
  let supabaseClient: any;
  const futureStart = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const futureEnd = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  beforeEach(() => {
    rpcHandlers = {};
    rpcSpy = jasmine.createSpy('rpc').and.callFake((fn: string) => {
      const handler = rpcHandlers[fn];
      if (handler) {
        return handler();
      }
      return Promise.resolve({ data: null, error: null });
    });

    supabaseClient = {
      rpc: rpcSpy,
    };

    const supabaseServiceMock = {
      getClient: () => supabaseClient,
    };

    const walletServiceMock = jasmine.createSpyObj<WalletService>('WalletService', [
      'lockRentalAndDeposit',
      'unlockFunds',
    ]);

    const pwaServiceMock = jasmine.createSpyObj<PwaService>('PwaService', [
      'setAppBadge',
      'clearAppBadge',
    ]);

    const insuranceServiceMock = jasmine.createSpyObj<InsuranceService>('InsuranceService', [
      'activateCoverage',
      'getInsuranceSummary',
      'calculateSecurityDeposit',
      'hasOwnerInsurance',
    ]);
    insuranceServiceMock.activateCoverage.and.resolveTo('coverage-123');

    TestBed.configureTestingModule({
      providers: [
        BookingsService,
        { provide: SupabaseClientService, useValue: supabaseServiceMock },
        { provide: WalletService, useValue: walletServiceMock },
        { provide: PwaService, useValue: pwaServiceMock },
        { provide: InsuranceService, useValue: insuranceServiceMock },
      ],
    });

    service = TestBed.inject(BookingsService);
  });

  it('crea una reserva cuando el auto está disponible', async () => {
    const bookingId = 'booking-123';
    const fakeBooking = { id: bookingId, status: 'pending' } as any;

    rpcHandlers['is_car_available'] = () => Promise.resolve({ data: true, error: null });
    rpcHandlers['request_booking'] = () =>
      Promise.resolve({ data: { booking_id: bookingId }, error: null });
    rpcHandlers['pricing_recalculate'] = () => Promise.resolve({ data: null, error: null });

    spyOn(service, 'getBookingById').and.resolveTo(fakeBooking);

    const result = await service.createBookingWithValidation('car-1', futureStart, futureEnd);

    expect(result.success).toBeTrue();
    expect(result.booking).toEqual(fakeBooking);
    expect(rpcSpy).toHaveBeenCalledWith('is_car_available', jasmine.any(Object));
    expect(rpcSpy).toHaveBeenCalledWith('request_booking', jasmine.any(Object));
  });

  it('retorna error cuando el auto no está disponible', async () => {
    rpcHandlers['is_car_available'] = () => Promise.resolve({ data: false, error: null });

    const result = await service.createBookingWithValidation('car-2', futureStart, futureEnd);

    expect(result.success).toBeFalse();
    expect(result.error).toContain('no está disponible');
    expect(rpcSpy).toHaveBeenCalledWith('is_car_available', jasmine.any(Object));
  });
});
