import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RiskService } from './risk.service';

describe('RiskService', () => {
  let component: RiskService;
  let fixture: ComponentFixture<RiskService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskService],
    }).compileComponents();

    fixture = TestBed.createComponent(RiskService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
