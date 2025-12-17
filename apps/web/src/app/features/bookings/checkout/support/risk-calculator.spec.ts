import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckoutRiskCalculator } from './risk-calculator';

describe('CheckoutRiskCalculator', () => {
  let component: CheckoutRiskCalculator;
  let fixture: ComponentFixture<CheckoutRiskCalculator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckoutRiskCalculator],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutRiskCalculator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
