import { TestBed } from '@angular/core/testing';
import { BookingInitiationService } from './booking-initiation.service';

describe('BookingInitiationService', () => {
  let service: BookingInitiationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BookingInitiationService]
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
