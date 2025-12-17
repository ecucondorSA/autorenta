import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RiskPolicyTableComponent } from './risk-policy-table.component';

describe('RiskPolicyTableComponent', () => {
  let component: RiskPolicyTableComponent;
  let fixture: ComponentFixture<RiskPolicyTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskPolicyTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RiskPolicyTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
