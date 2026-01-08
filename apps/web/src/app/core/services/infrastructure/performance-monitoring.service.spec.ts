import { TestBed } from '@angular/core/testing';
import { PerformanceMonitoringService } from '@core/services/infrastructure/performance-monitoring.service';

describe('PerformanceMonitoringService', () => {
  let service: PerformanceMonitoringService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PerformanceMonitoringService],
    });
    service = TestBed.inject(PerformanceMonitoringService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getMemoryUsage method', () => {
    expect(typeof service.getMemoryUsage).toBe('function');
  });
});
