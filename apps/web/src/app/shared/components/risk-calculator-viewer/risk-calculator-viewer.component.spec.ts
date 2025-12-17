import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RiskCalculatorViewerComponent } from './risk-calculator-viewer.component';

describe('RiskCalculatorViewerComponent', () => {
  let component: RiskCalculatorViewerComponent;
  let fixture: ComponentFixture<RiskCalculatorViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskCalculatorViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RiskCalculatorViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
