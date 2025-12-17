import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingPaymentPage } from './booking-payment.page';

describe('BookingPaymentPage', () => {
  let component: BookingPaymentPage;
  let fixture: ComponentFixture<BookingPaymentPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingPaymentPage],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingPaymentPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
