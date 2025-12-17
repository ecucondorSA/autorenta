import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InsuranceSummaryCardComponent } from './insurance-summary-card.component';

describe('InsuranceSummaryCardComponent', () => {
  let component: InsuranceSummaryCardComponent;
  let fixture: ComponentFixture<InsuranceSummaryCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsuranceSummaryCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InsuranceSummaryCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
