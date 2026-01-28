import { TestBed } from '@angular/core/testing';
import { AssetPreloaderService } from '@core/services/ui/asset-preloader.service';
import { testProviders } from '@app/testing/test-providers';

describe('AssetPreloaderService', () => {
  let service: AssetPreloaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, AssetPreloaderService],
    });
    service = TestBed.inject(AssetPreloaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have preloadCriticalAssets method', () => {
    expect(typeof service.preloadCriticalAssets).toBe('function');
  });

  it('should have preloadMapbox method', () => {
    expect(typeof service.preloadMapbox).toBe('function');
  });

  it('should have isMapboxLoaded method', () => {
    expect(typeof service.isMapboxLoaded).toBe('function');
  });
});
