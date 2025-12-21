import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { BookingDetailPage } from './booking-detail.page';
import { BookingsService } from '../../../core/services/bookings.service';
import { AuthService } from '../../../core/services/auth.service';
import { LoggerService } from '../../../core/services/logger.service';
import { PaymentsService } from '../../../core/services/payments.service';
import { ReviewsService } from '../../../core/services/reviews.service';
import { BookingConfirmationService } from '../../../core/services/booking-confirmation.service';
import { MetaService } from '../../../core/services/meta.service';
import { ExchangeRateService } from '../../../core/services/exchange-rate.service';
import { FgoV1_1Service } from '../../../core/services/fgo-v1-1.service';
import { InsuranceService } from '../../../core/services/insurance.service';
import { BookingOpsService } from '../../../core/services/booking-ops.service';
import { TrafficInfractionsService } from '../../../core/services/traffic-infractions.service';
import { BookingFlowService } from '../../../core/services/booking-flow.service';

describe('BookingDetailPage (vitest)', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  const makeComponent = () => {
    const updateBooking = vi.fn(async (_id: string, updates: any) => ({
      id: 'booking-1',
      metadata: updates?.metadata ?? {},
    }));

    const logger = {
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: BookingsService, useValue: { updateBooking } },
        { provide: LoggerService, useValue: { ...logger, createChildLogger: () => logger } },
        {
          provide: AuthService,
          useValue: { session$: () => ({ user: { id: 'renter-1' } }) },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'booking-1' }) } },
        },
        { provide: PaymentsService, useValue: {} },
        { provide: ReviewsService, useValue: {} },
        { provide: BookingFlowService, useValue: {} },
        { provide: BookingConfirmationService, useValue: {} },
        { provide: MetaService, useValue: {} },
        { provide: ExchangeRateService, useValue: {} },
        { provide: FgoV1_1Service, useValue: { getInspections: () => of([]) } },
        { provide: InsuranceService, useValue: {} },
        { provide: BookingOpsService, useValue: {} },
        { provide: TrafficInfractionsService, useValue: {} },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new BookingDetailPage());

    return { component, updateBooking };
  };

  it('merges return checklist from metadata', () => {
    const { component } = makeComponent();
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

    const fuelItem = component.returnChecklistItems().find((i) => i.id === 'fuel');
    expect(fuelItem?.checked).toBe(true);
  });

  it('syncs return checklist to metadata on toggle', async () => {
    vi.useFakeTimers();
    const { component, updateBooking } = makeComponent();
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
    vi.advanceTimersByTime(600);
    await Promise.resolve();

    expect(updateBooking).toHaveBeenCalled();
    const call = updateBooking.mock.calls[0][1];
    expect(call.metadata.return_checklist).toBeDefined();
    vi.useRealTimers();
  });

  it('builds car return considerations from car rules', () => {
    const { component } = makeComponent();
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
