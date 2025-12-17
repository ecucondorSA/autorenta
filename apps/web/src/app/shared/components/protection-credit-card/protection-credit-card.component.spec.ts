import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProtectionCreditCardComponent } from './protection-credit-card.component';

describe('ProtectionCreditCardComponent', () => {
  let component: ProtectionCreditCardComponent;
  let fixture: ComponentFixture<ProtectionCreditCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProtectionCreditCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProtectionCreditCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
