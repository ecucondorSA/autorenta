import { TestBed } from '@angular/core/testing';
import { BookingFlowService } from '@core/services/bookings/booking-flow.service';

describe('BookingFlowService', () => {
  let service: BookingFlowService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BookingFlowService]
    });
    service = TestBed.inject(BookingFlowService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getAvailableActions method', () => {
    expect(typeof service.getAvailableActions).toBe('function');
  });

  it('should have getNextStep method', () => {
    expect(typeof service.getNextStep).toBe('function');
  });

  it('should have navigateToNextStep method', () => {
    expect(typeof service.navigateToNextStep).toBe('function');
  });

  it('should have getBookingStatusInfo method', () => {
    expect(typeof service.getBookingStatusInfo).toBe('function');
  });

  it('should have validateStatusTransition method', () => {
    expect(typeof service.validateStatusTransition).toBe('function');
  });

});
