import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingDetailPaymentPage } from './booking-detail-payment.page';

describe('BookingDetailPaymentPage', () => {
  let component: BookingDetailPaymentPage;
  let fixture: ComponentFixture<BookingDetailPaymentPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingDetailPaymentPage],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingDetailPaymentPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
