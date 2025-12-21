import { TestBed } from '@angular/core/testing';
import { VerificationNotificationsService } from '@core/services/verification/verification-notifications.service';

describe('VerificationNotificationsService', () => {
  let service: VerificationNotificationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VerificationNotificationsService]
    });
    service = TestBed.inject(VerificationNotificationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have initialize method', () => {
    expect(typeof service.initialize).toBe('function');
  });

});
