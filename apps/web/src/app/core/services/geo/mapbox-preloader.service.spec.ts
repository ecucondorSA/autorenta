import { TestBed } from '@angular/core/testing';
import { MapboxPreloaderService } from '@core/services/geo/mapbox-preloader.service';
import { testProviders } from '@app/testing/test-providers';

describe('MapboxPreloaderService', () => {
  let service: MapboxPreloaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, MapboxPreloaderService],
    });
    service = TestBed.inject(MapboxPreloaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have preloadMap method', () => {
    expect(typeof service.preloadMap).toBe('function');
  });

  it('should have getPreloadedMap method', () => {
    expect(typeof service.getPreloadedMap).toBe('function');
  });

  it('should have getMapboxGL method', () => {
    expect(typeof service.getMapboxGL).toBe('function');
  });

  it('should have transferMapToContainer method', () => {
    expect(typeof service.transferMapToContainer).toBe('function');
  });

  it('should have createMapInContainer method', () => {
    expect(typeof service.createMapInContainer).toBe('function');
  });

  it('should have isMapReady method', () => {
    expect(typeof service.isMapReady).toBe('function');
  });

  it('should have destroy method', () => {
    expect(typeof service.destroy).toBe('function');
  });
});
