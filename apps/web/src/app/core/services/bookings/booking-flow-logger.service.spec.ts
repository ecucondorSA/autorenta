import { TestBed } from '@angular/core/testing';
import { BookingFlowLoggerService } from '@core/services/bookings/booking-flow-logger.service';

describe('BookingFlowLoggerService', () => {
  let service: BookingFlowLoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BookingFlowLoggerService],
    });
    service = TestBed.inject(BookingFlowLoggerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have logStatusTransition method', () => {
    expect(typeof service.logStatusTransition).toBe('function');
  });

  it('should have logAction method', () => {
    expect(typeof service.logAction).toBe('function');
  });

  it('should have logValidation method', () => {
    expect(typeof service.logValidation).toBe('function');
  });

  it('should have logError method', () => {
    expect(typeof service.logError).toBe('function');
  });

  it('should have logPerformance method', () => {
    expect(typeof service.logPerformance).toBe('function');
  });
});
