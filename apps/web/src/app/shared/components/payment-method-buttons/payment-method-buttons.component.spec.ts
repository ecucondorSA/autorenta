import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentMethodButtonsComponent } from './payment-method-buttons.component';

describe('PaymentMethodButtonsComponent', () => {
  let component: PaymentMethodButtonsComponent;
  let fixture: ComponentFixture<PaymentMethodButtonsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentMethodButtonsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentMethodButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
