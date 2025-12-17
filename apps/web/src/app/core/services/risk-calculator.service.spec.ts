import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RiskCalculatorService } from './risk-calculator.service';

describe('RiskCalculatorService', () => {
  let component: RiskCalculatorService;
  let fixture: ComponentFixture<RiskCalculatorService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskCalculatorService],
    }).compileComponents();

    fixture = TestBed.createComponent(RiskCalculatorService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
