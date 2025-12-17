import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentModeToggleComponent } from './payment-mode-toggle.component';

describe('PaymentModeToggleComponent', () => {
  let component: PaymentModeToggleComponent;
  let fixture: ComponentFixture<PaymentModeToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentModeToggleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentModeToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
