import { TestBed } from '@angular/core/testing';
import { ExchangeRateService } from '@core/services/payments/exchange-rate.service';

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ExchangeRateService]
    });
    service = TestBed.inject(ExchangeRateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getBinanceRate method', () => {
    expect(typeof service.getBinanceRate).toBe('function');
  });

  it('should have getPlatformRate method', () => {
    expect(typeof service.getPlatformRate).toBe('function');
  });

  it('should have getRate method', () => {
    expect(typeof service.getRate).toBe('function');
  });

  it('should have convertArsToUsd method', () => {
    expect(typeof service.convertArsToUsd).toBe('function');
  });

  it('should have convertUsdToArs method', () => {
    expect(typeof service.convertUsdToArs).toBe('function');
  });

  it('should have getConversionPreview method', () => {
    expect(typeof service.getConversionPreview).toBe('function');
  });

  it('should have getLastKnownRates method', () => {
    expect(typeof service.getLastKnownRates).toBe('function');
  });

  it('should have getLastKnownPlatformRate method', () => {
    expect(typeof service.getLastKnownPlatformRate).toBe('function');
  });

  it('should have getLastKnownBinanceRate method', () => {
    expect(typeof service.getLastKnownBinanceRate).toBe('function');
  });

  it('should have isCacheValid method', () => {
    expect(typeof service.isCacheValid).toBe('function');
  });

});
