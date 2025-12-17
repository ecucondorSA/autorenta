import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let component: AnalyticsService;
  let fixture: ComponentFixture<AnalyticsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyticsService],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
