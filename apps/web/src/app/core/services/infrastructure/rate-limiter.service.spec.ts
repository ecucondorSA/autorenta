import { TestBed } from '@angular/core/testing';
import { RateLimiterService } from '@core/services/infrastructure/rate-limiter.service';

describe('RateLimiterService', () => {
  let service: RateLimiterService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RateLimiterService],
    });
    service = TestBed.inject(RateLimiterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have isAllowed method', () => {
    expect(typeof service.isAllowed).toBe('function');
  });

  it('should have recordAttempt method', () => {
    expect(typeof service.recordAttempt).toBe('function');
  });

  it('should have getRetryAfterSeconds method', () => {
    expect(typeof service.getRetryAfterSeconds).toBe('function');
  });

  it('should have getRemainingAttempts method', () => {
    expect(typeof service.getRemainingAttempts).toBe('function');
  });

  it('should have reset method', () => {
    expect(typeof service.reset).toBe('function');
  });

  it('should have getErrorMessage method', () => {
    expect(typeof service.getErrorMessage).toBe('function');
  });

  it('should have logViolation method', () => {
    expect(typeof service.logViolation).toBe('function');
  });
});
