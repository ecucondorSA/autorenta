import { TestBed } from '@angular/core/testing';
import { NavigationService } from '@core/services/ui/navigation.service';

describe('NavigationService', () => {
  let service: NavigationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NavigationService],
    });
    service = TestBed.inject(NavigationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have navigateWithWaze method', () => {
    expect(typeof service.navigateWithWaze).toBe('function');
  });

  it('should have navigateWithGoogleMaps method', () => {
    expect(typeof service.navigateWithGoogleMaps).toBe('function');
  });

  it('should have navigateWithAppleMaps method', () => {
    expect(typeof service.navigateWithAppleMaps).toBe('function');
  });

  it('should have navigateAuto method', () => {
    expect(typeof service.navigateAuto).toBe('function');
  });

  it('should have getAvailableApps method', () => {
    expect(typeof service.getAvailableApps).toBe('function');
  });

  it('should have getRecommendedApp method', () => {
    expect(typeof service.getRecommendedApp).toBe('function');
  });
});
