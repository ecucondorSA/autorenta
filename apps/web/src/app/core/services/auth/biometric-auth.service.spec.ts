import { TestBed } from '@angular/core/testing';
import { BiometricAuthService } from '@core/services/auth/biometric-auth.service';

describe('BiometricAuthService', () => {
  let service: BiometricAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BiometricAuthService],
    });
    service = TestBed.inject(BiometricAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have isAvailable method', () => {
    expect(typeof service.isAvailable).toBe('function');
  });

  it('should have authenticate method', () => {
    expect(typeof service.authenticate).toBe('function');
  });

  it('should have authenticatePayment method', () => {
    expect(typeof service.authenticatePayment).toBe('function');
  });
});
