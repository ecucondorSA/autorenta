import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingPaymentStepComponent } from './booking-payment-step.component';

describe('BookingPaymentStepComponent', () => {
  let component: BookingPaymentStepComponent;
  let fixture: ComponentFixture<BookingPaymentStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingPaymentStepComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingPaymentStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
