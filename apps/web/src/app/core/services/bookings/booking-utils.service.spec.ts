import { TestBed } from '@angular/core/testing';
import { BookingUtilsService } from '@core/services/bookings/booking-utils.service';
import { testProviders } from '@app/testing/test-providers';

describe('BookingUtilsService', () => {
  let service: BookingUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, BookingUtilsService],
    });
    service = TestBed.inject(BookingUtilsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getTimeUntilExpiration method', () => {
    expect(typeof service.getTimeUntilExpiration).toBe('function');
  });

  it('should have formatTimeRemaining method', () => {
    expect(typeof service.formatTimeRemaining).toBe('function');
  });

  it('should have isExpired method', () => {
    expect(typeof service.isExpired).toBe('function');
  });

  it('should have extractBookingId method', () => {
    expect(typeof service.extractBookingId).toBe('function');
  });

  it('should have calculateDuration method', () => {
    expect(typeof service.calculateDuration).toBe('function');
  });

  it('should have isInPast method', () => {
    expect(typeof service.isInPast).toBe('function');
  });

  it('should have isActive method', () => {
    expect(typeof service.isActive).toBe('function');
  });

  it('should have isUpcoming method', () => {
    expect(typeof service.isUpcoming).toBe('function');
  });
});
