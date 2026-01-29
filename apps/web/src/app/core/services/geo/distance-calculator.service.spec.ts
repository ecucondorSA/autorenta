import { TestBed } from '@angular/core/testing';
import { DistanceCalculatorService } from '@core/services/geo/distance-calculator.service';
import { testProviders } from '@app/testing/test-providers';

describe('DistanceCalculatorService', () => {
  let service: DistanceCalculatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, DistanceCalculatorService],
    });
    service = TestBed.inject(DistanceCalculatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have calculateDistance method', () => {
    expect(typeof service.calculateDistance).toBe('function');
  });

  it('should have calculateDistanceMetadata method', () => {
    expect(typeof service.calculateDistanceMetadata).toBe('function');
  });

  it('should have getDistanceTier method', () => {
    expect(typeof service.getDistanceTier).toBe('function');
  });

  it('should have getGuaranteeMultiplier method', () => {
    expect(typeof service.getGuaranteeMultiplier).toBe('function');
  });

  it('should have calculateDeliveryFee method', () => {
    expect(typeof service.calculateDeliveryFee).toBe('function');
  });

  it('should have isWithinDeliveryRange method', () => {
    expect(typeof service.isWithinDeliveryRange).toBe('function');
  });

  it('should have formatDistance method', () => {
    expect(typeof service.formatDistance).toBe('function');
  });

  it('should have formatDeliveryFee method', () => {
    expect(typeof service.formatDeliveryFee).toBe('function');
  });

  it('should have calculateDistanceBetweenLocations method', () => {
    expect(typeof service.calculateDistanceBetweenLocations).toBe('function');
  });

  it('should have isNearLocation method', () => {
    expect(typeof service.isNearLocation).toBe('function');
  });
});
