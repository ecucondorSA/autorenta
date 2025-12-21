import { TestBed } from '@angular/core/testing';
import { MapboxDirectionsService } from '@core/services/geo/mapbox-directions.service';

describe('MapboxDirectionsService', () => {
  let service: MapboxDirectionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MapboxDirectionsService]
    });
    service = TestBed.inject(MapboxDirectionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getDirections method', () => {
    expect(typeof service.getDirections).toBe('function');
  });

  it('should have formatDuration method', () => {
    expect(typeof service.formatDuration).toBe('function');
  });

  it('should have formatDistance method', () => {
    expect(typeof service.formatDistance).toBe('function');
  });

  it('should have getRouteInstructions method', () => {
    expect(typeof service.getRouteInstructions).toBe('function');
  });

});
