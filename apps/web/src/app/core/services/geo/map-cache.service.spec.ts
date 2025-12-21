import { TestBed } from '@angular/core/testing';
import { MapCacheService } from '@core/services/geo/map-cache.service';

describe('MapCacheService', () => {
  let service: MapCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MapCacheService]
    });
    service = TestBed.inject(MapCacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getIsochrone method', () => {
    expect(typeof service.getIsochrone).toBe('function');
  });

  it('should have setIsochrone method', () => {
    expect(typeof service.setIsochrone).toBe('function');
  });

  it('should have getDirections method', () => {
    expect(typeof service.getDirections).toBe('function');
  });

  it('should have setDirections method', () => {
    expect(typeof service.setDirections).toBe('function');
  });

  it('should have clearAll method', () => {
    expect(typeof service.clearAll).toBe('function');
  });

  it('should have clearExpired method', () => {
    expect(typeof service.clearExpired).toBe('function');
  });

  it('should have getStats method', () => {
    expect(typeof service.getStats).toBe('function');
  });

});
