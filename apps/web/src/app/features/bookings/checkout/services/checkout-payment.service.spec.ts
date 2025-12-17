import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckoutPaymentService } from './checkout-payment.service';

describe('CheckoutPaymentService', () => {
  let component: CheckoutPaymentService;
  let fixture: ComponentFixture<CheckoutPaymentService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckoutPaymentService],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutPaymentService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
