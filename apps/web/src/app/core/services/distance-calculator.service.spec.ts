import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DistanceCalculatorService } from './distance-calculator.service';

describe('DistanceCalculatorService', () => {
  let component: DistanceCalculatorService;
  let fixture: ComponentFixture<DistanceCalculatorService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DistanceCalculatorService],
    }).compileComponents();

    fixture = TestBed.createComponent(DistanceCalculatorService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
