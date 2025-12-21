import { TestBed } from '@angular/core/testing';
import { ExternalNavigationService } from '@core/services/ui/external-navigation.service';

describe('ExternalNavigationService', () => {
  let service: ExternalNavigationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ExternalNavigationService]
    });
    service = TestBed.inject(ExternalNavigationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have redirect method', () => {
    expect(typeof service.redirect).toBe('function');
  });

});
