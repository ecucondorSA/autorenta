import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoverageFundDashboardComponent } from './coverage-fund-dashboard.component';

describe('CoverageFundDashboardComponent', () => {
  let component: CoverageFundDashboardComponent;
  let fixture: ComponentFixture<CoverageFundDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoverageFundDashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CoverageFundDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
