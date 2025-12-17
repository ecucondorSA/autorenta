import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReviewRadarChartComponent } from './review-radar-chart.component';

describe('ReviewRadarChartComponent', () => {
  let component: ReviewRadarChartComponent;
  let fixture: ComponentFixture<ReviewRadarChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewRadarChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewRadarChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
