import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingConfirmationService } from '@core/services/bookings/booking-confirmation.service';
import { BookingOpsService } from '@core/services/bookings/booking-ops.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { InsuranceService } from '@core/services/bookings/insurance.service';
import { ReviewsService } from '@core/services/cars/reviews.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { TrafficInfractionsService } from '@core/services/infrastructure/traffic-infractions.service';
import { ExchangeRateService } from '@core/services/payments/exchange-rate.service';
import { PaymentsService } from '@core/services/payments/payments.service';
import { MetaService } from '@core/services/ui/meta.service';
import { FgoV1_1Service } from '@core/services/verification/fgo-v1-1.service';
import { AlertController } from '@ionic/angular';
import { of } from 'rxjs';
import type { Booking } from '../../../core/models';
import { BookingDetailPage } from './booking-detail.page';
import { testProviders } from '@app/testing/test-providers';

describe('BookingDetailPage - return checklist', () => {
  let component: BookingDetailPage;
  let fixture: ComponentFixture<BookingDetailPage>;
  let bookingsService: jasmine.SpyObj<BookingsService>;
  let loggerService: jasmine.SpyObj<LoggerService>;

  beforeEach(async () => {
    try {
      window.localStorage?.clear();
    } catch {
      // ignore
    }

    bookingsService = jasmine.createSpyObj('BookingsService', ['updateBooking']);
    const baseBooking: Booking = {
      id: 'booking-1',
      car_id: 'car-1',
      user_id: 'renter-1',
      renter_id: 'renter-1',
      start_at: new Date().toISOString(),
      end_at: new Date(Date.now() + 3600000).toISOString(),
      status: 'in_progress' as any,
      total_amount: 10 as any,
      currency: 'ARS' as any,
      created_at: new Date().toISOString(),
      metadata: {},
    } as any;

    bookingsService.updateBooking.and.callFake(async (_id: string, updates: Partial<Booking>) => {
      const mergedMetadata = {
        ...(baseBooking.metadata as any),
        ...(((updates as any)?.metadata ?? {}) as any),
      };

      return {
        ...baseBooking,
        ...(updates as any),
        metadata: mergedMetadata,
      } as Booking;
    });

    loggerService = jasmine.createSpyObj('LoggerService', ['createChildLogger']);
    loggerService.createChildLogger.and.returnValue({
      warn: jasmine.createSpy('warn'),
    } as any);

    await TestBed.configureTestingModule({
      imports: [BookingDetailPage],
      providers: [
        ...testProviders,
        { provide: BookingsService, useValue: bookingsService },
        { provide: LoggerService, useValue: loggerService },
        {
          provide: AuthService,
          useValue: {
            session$: () => ({ user: { id: 'renter-1' } }),
            ensureSession: () => Promise.resolve({ user: { id: 'renter-1' } }),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'booking-1' }) } },
        },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: PaymentsService, useValue: {} },
        { provide: ReviewsService, useValue: {} },
        { provide: BookingConfirmationService, useValue: {} },
        { provide: AlertController, useValue: {} },
        { provide: MetaService, useValue: {} },
        { provide: ExchangeRateService, useValue: {} },
        { provide: FgoV1_1Service, useValue: { getInspections: () => of([]) } },
        { provide: InsuranceService, useValue: {} },
        { provide: BookingOpsService, useValue: {} },
        { provide: TrafficInfractionsService, useValue: {} },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(BookingDetailPage, {
        set: { schemas: [CUSTOM_ELEMENTS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(BookingDetailPage);
    component = fixture.componentInstance;
  });

  it('should merge checklist from metadata on load', () => {
    const booking: any = {
      id: 'booking-1',
      car_id: 'car-1',
      user_id: 'renter-1',
      renter_id: 'renter-1',
      start_at: new Date().toISOString(),
      end_at: new Date(Date.now() + 3600000).toISOString(),
      status: 'in_progress',
      total_amount: 10,
      currency: 'ARS',
      created_at: new Date().toISOString(),
      metadata: {
        return_checklist: [{ id: 'fuel', checked: true }],
      },
    };

    component.booking.set(booking);
    (component as any).loadReturnChecklist(booking);

    const items = component.returnChecklistItems();
    const fuelItem = items.find((i) => i.id === 'fuel');
    expect(fuelItem?.checked).toBeTrue();
  });

  it('should sync checklist to metadata on toggle', fakeAsync(() => {
    const booking: any = {
      id: 'booking-1',
      car_id: 'car-1',
      user_id: 'renter-1',
      renter_id: 'renter-1',
      start_at: new Date().toISOString(),
      end_at: new Date(Date.now() + 3600000).toISOString(),
      status: 'in_progress',
      total_amount: 10,
      currency: 'ARS',
      created_at: new Date().toISOString(),
      metadata: {},
    };

    component.booking.set(booking);
    (component as any).loadReturnChecklist(booking);
    component.toggleReturnChecklistItem('final-photos');

    tick(600);

    expect(bookingsService.updateBooking).toHaveBeenCalled();
    const updateArg = bookingsService.updateBooking.calls.mostRecent().args[1] as any;
    expect(updateArg.metadata.return_checklist).toBeDefined();
  }));

  it('should build car return considerations based on car rules', () => {
    const booking: any = {
      id: 'booking-1',
      car_id: 'car-1',
      user_id: 'renter-1',
      renter_id: 'renter-1',
      start_at: new Date().toISOString(),
      end_at: new Date(Date.now() + 3600000).toISOString(),
      status: 'in_progress',
      total_amount: 10,
      currency: 'ARS',
      created_at: new Date().toISOString(),
      delivery_required: true,
      car: {
        fuel_policy: 'full_to_full',
        mileage_limit: 120,
        extra_km_price: 50,
        allow_smoking: false,
        allow_pets: false,
        allow_rideshare: false,
        max_distance_km: 200,
      },
      metadata: {},
    };

    component.booking.set(booking);

    const notes = component.carReturnConsiderations();
    expect(notes.join(' ')).toContain('tanque lleno');
    expect(notes.join(' ')).toContain('Kilometraje máximo');
    expect(notes.join(' ')).toContain('No se permite fumar');
    expect(notes.join(' ')).toContain('No se permiten mascotas');
    expect(notes.join(' ')).toContain('Coordiná la devolución');
  });
});
