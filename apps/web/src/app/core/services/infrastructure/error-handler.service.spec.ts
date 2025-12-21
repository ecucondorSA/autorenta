import { TestBed } from '@angular/core/testing';
import { ErrorHandlerService } from '@core/services/infrastructure/error-handler.service';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ErrorHandlerService]
    });
    service = TestBed.inject(ErrorHandlerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have handleError method', () => {
    expect(typeof service.handleError).toBe('function');
  });

  it('should have handleNetworkError method', () => {
    expect(typeof service.handleNetworkError).toBe('function');
  });

  it('should have handleAuthError method', () => {
    expect(typeof service.handleAuthError).toBe('function');
  });

  it('should have handleValidationError method', () => {
    expect(typeof service.handleValidationError).toBe('function');
  });

  it('should have handlePaymentError method', () => {
    expect(typeof service.handlePaymentError).toBe('function');
  });

  it('should have handleBookingError method', () => {
    expect(typeof service.handleBookingError).toBe('function');
  });

});
