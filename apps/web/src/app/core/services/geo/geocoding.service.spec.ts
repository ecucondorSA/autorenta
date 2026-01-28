import { TestBed } from '@angular/core/testing';
import { GeocodingService } from '@core/services/geo/geocoding.service';
import { testProviders } from '@app/testing/test-providers';

describe('GeocodingService', () => {
  let service: GeocodingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, GeocodingService],
    });
    service = TestBed.inject(GeocodingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have geocodeAddress method', () => {
    expect(typeof service.geocodeAddress).toBe('function');
  });

  it('should have geocodeStructuredAddress method', () => {
    expect(typeof service.geocodeStructuredAddress).toBe('function');
  });

  it('should have getCityCoordinates method', () => {
    expect(typeof service.getCityCoordinates).toBe('function');
  });

  it('should have getLocationSuggestions method', () => {
    expect(typeof service.getLocationSuggestions).toBe('function');
  });

  it('should have reverseGeocode method', () => {
    expect(typeof service.reverseGeocode).toBe('function');
  });
});
