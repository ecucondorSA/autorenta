import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DrivingStatsPage } from './driving-stats.page';

describe('DrivingStatsPage', () => {
  let component: DrivingStatsPage;
  let fixture: ComponentFixture<DrivingStatsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrivingStatsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(DrivingStatsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
