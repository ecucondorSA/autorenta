import { CUSTOM_ELEMENTS_SCHEMA, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CarsCompareService } from '@core/services/cars/cars-compare.service';
import { CarsService } from '@core/services/cars/cars.service';
import { DistanceCalculatorService } from '@core/services/geo/distance-calculator.service';
import { LocationService } from '@core/services/geo/location.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { MetaService } from '@core/services/ui/meta.service';
import { UrgentRentalService } from '@core/services/bookings/urgent-rental.service';
import { CarsListPage } from './cars-list.page';

describe('CarsListPage', () => {
  let fixture: ComponentFixture<CarsListPage>;
  let component: CarsListPage;

  const carsServiceMock = {
    getAvailableCars: jasmine.createSpy('getAvailableCars').and.resolveTo([]),
    listActiveCars: jasmine.createSpy('listActiveCars').and.resolveTo([]),
    getCarBrands: jasmine.createSpy('getCarBrands').and.resolveTo([]),
    getAllCarModels: jasmine.createSpy('getAllCarModels').and.resolveTo([]),
  };

  const locationServiceMock = {
    getUserLocation: jasmine.createSpy('getUserLocation').and.resolveTo(null),
  };

  const compareServiceMock = {
    count: signal(0),
  };

  const metaServiceMock = {
    updateCarsListMeta: jasmine.createSpy('updateCarsListMeta'),
  };

  const loggerServiceMock = {
    error: jasmine.createSpy('error'),
    warn: jasmine.createSpy('warn'),
    info: jasmine.createSpy('info'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarsListPage, RouterTestingModule],
      providers: [
        // Prevent SupabaseClientService from trying to initialize with missing env vars
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: CarsService, useValue: carsServiceMock },
        { provide: CarsCompareService, useValue: compareServiceMock },
        { provide: LocationService, useValue: locationServiceMock },
        { provide: MetaService, useValue: metaServiceMock },
        { provide: LoggerService, useValue: loggerServiceMock },
        { provide: DistanceCalculatorService, useValue: {} },
        { provide: UrgentRentalService, useValue: {} },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CarsListPage);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders empty state when no cars and not loading', () => {
    component.loading.set(false);
    component.loadError.set(null);
    component.cars.set([]);

    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('[data-testid="empty-state"]');
    expect(empty).toBeTruthy();
  });

  it('does not render empty state while loading', () => {
    component.loading.set(true);
    component.loadError.set(null);
    component.cars.set([]);

    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('[data-testid="empty-state"]');
    expect(empty).toBeFalsy();
  });

  it('renders error banner when loadError is set', () => {
    component.loading.set(false);
    component.loadError.set('No pudimos cargar los vehículos. Intenta nuevamente.');

    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('[data-testid="load-error"]');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Error al cargar');
  });
});
