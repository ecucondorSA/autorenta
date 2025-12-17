import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DistanceSummaryComponent } from './distance-summary.component';

describe('DistanceSummaryComponent', () => {
  let component: DistanceSummaryComponent;
  let fixture: ComponentFixture<DistanceSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DistanceSummaryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DistanceSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
