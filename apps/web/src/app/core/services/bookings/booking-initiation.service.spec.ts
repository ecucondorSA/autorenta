import { TestBed } from '@angular/core/testing';
import { BookingInitiationService } from '@core/services/bookings/booking-initiation.service';
import { testProviders } from '@app/testing/test-providers';

describe('BookingInitiationService', () => {
  let service: BookingInitiationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, BookingInitiationService],
    });
    service = TestBed.inject(BookingInitiationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have startFromCar method', () => {
    expect(typeof service.startFromCar).toBe('function');
  });
});
