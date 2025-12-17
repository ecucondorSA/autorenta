import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RiskMatrixService } from './risk-matrix.service';

describe('RiskMatrixService', () => {
  let component: RiskMatrixService;
  let fixture: ComponentFixture<RiskMatrixService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskMatrixService],
    }).compileComponents();

    fixture = TestBed.createComponent(RiskMatrixService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
