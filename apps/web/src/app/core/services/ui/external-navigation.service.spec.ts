import { TestBed } from '@angular/core/testing';
import { ExternalNavigationService } from '@core/services/ui/external-navigation.service';
import { testProviders } from '@app/testing/test-providers';

describe('ExternalNavigationService', () => {
  let service: ExternalNavigationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, ExternalNavigationService],
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
