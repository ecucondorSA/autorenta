import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PerformanceMonitoringService } from './performance-monitoring.service';

describe('PerformanceMonitoringService', () => {
  let component: PerformanceMonitoringService;
  let fixture: ComponentFixture<PerformanceMonitoringService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerformanceMonitoringService],
    }).compileComponents();

    fixture = TestBed.createComponent(PerformanceMonitoringService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
