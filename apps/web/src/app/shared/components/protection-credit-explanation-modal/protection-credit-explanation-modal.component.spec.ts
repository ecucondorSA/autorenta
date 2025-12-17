import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProtectionCreditExplanationModalComponent } from './protection-credit-explanation-modal.component';

describe('ProtectionCreditExplanationModalComponent', () => {
  let component: ProtectionCreditExplanationModalComponent;
  let fixture: ComponentFixture<ProtectionCreditExplanationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProtectionCreditExplanationModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProtectionCreditExplanationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
