import { TestBed } from '@angular/core/testing';
import { MetaService } from './meta.service';

describe('MetaService', () => {
  let service: MetaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MetaService]
    });
    service = TestBed.inject(MetaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have updateMeta method', () => {
    expect(typeof service.updateMeta).toBe('function');
  });

  it('should have updateCarDetailMeta method', () => {
    expect(typeof service.updateCarDetailMeta).toBe('function');
  });

  it('should have updateCarsListMeta method', () => {
    expect(typeof service.updateCarsListMeta).toBe('function');
  });

  it('should have updateWalletMeta method', () => {
    expect(typeof service.updateWalletMeta).toBe('function');
  });

  it('should have updateBookingDetailMeta method', () => {
    expect(typeof service.updateBookingDetailMeta).toBe('function');
  });

  it('should have updateProfileMeta method', () => {
    expect(typeof service.updateProfileMeta).toBe('function');
  });

  it('should have addStructuredData method', () => {
    expect(typeof service.addStructuredData).toBe('function');
  });

  it('should have addCarProductData method', () => {
    expect(typeof service.addCarProductData).toBe('function');
  });

  it('should have resetMeta method', () => {
    expect(typeof service.resetMeta).toBe('function');
  });

});
