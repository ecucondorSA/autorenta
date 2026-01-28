import { TestBed } from '@angular/core/testing';
import { CarsCompareService } from '@core/services/cars/cars-compare.service';
import { testProviders } from '@app/testing/test-providers';

describe('CarsCompareService', () => {
  let service: CarsCompareService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, CarsCompareService],
    });
    service = TestBed.inject(CarsCompareService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have addCar method', () => {
    expect(typeof service.addCar).toBe('function');
  });

  it('should have removeCar method', () => {
    expect(typeof service.removeCar).toBe('function');
  });

  it('should have clearAll method', () => {
    expect(typeof service.clearAll).toBe('function');
  });

  it('should have isComparing method', () => {
    expect(typeof service.isComparing).toBe('function');
  });

  it('should have generateComparisonRows method', () => {
    expect(typeof service.generateComparisonRows).toBe('function');
  });
});
