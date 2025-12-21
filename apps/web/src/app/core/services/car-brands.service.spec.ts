import { TestBed } from '@angular/core/testing';
import { CarBrandsService } from './car-brands.service';

describe('CarBrandsService', () => {
  let service: CarBrandsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CarBrandsService]
    });
    service = TestBed.inject(CarBrandsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getCarBrands method', () => {
    expect(typeof service.getCarBrands).toBe('function');
  });

  it('should have getCarBrandByCode method', () => {
    expect(typeof service.getCarBrandByCode).toBe('function');
  });

  it('should have getInsuranceBrands method', () => {
    expect(typeof service.getInsuranceBrands).toBe('function');
  });

  it('should have getInsuranceBrandByCode method', () => {
    expect(typeof service.getInsuranceBrandByCode).toBe('function');
  });

  it('should have getCarBrandLogoPath method', () => {
    expect(typeof service.getCarBrandLogoPath).toBe('function');
  });

});
