import { TestBed } from '@angular/core/testing';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { testProviders } from '@app/testing/test-providers';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, LoggerService],
    });
    service = TestBed.inject(LoggerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have setTraceId method', () => {
    expect(typeof service.setTraceId).toBe('function');
  });

  it('should have getTraceId method', () => {
    expect(typeof service.getTraceId).toBe('function');
  });

  it('should have generateTraceId method', () => {
    expect(typeof service.generateTraceId).toBe('function');
  });

  it('should have debug method', () => {
    expect(typeof service.debug).toBe('function');
  });

  it('should have info method', () => {
    expect(typeof service.info).toBe('function');
  });

  it('should have warn method', () => {
    expect(typeof service.warn).toBe('function');
  });

  it('should have error method', () => {
    expect(typeof service.error).toBe('function');
  });

  it('should have critical method', () => {
    expect(typeof service.critical).toBe('function');
  });

  it('should have logAction method', () => {
    expect(typeof service.logAction).toBe('function');
  });

  it('should have logPerformance method', () => {
    expect(typeof service.logPerformance).toBe('function');
  });
});
