import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingCheckoutPage } from './booking-checkout.page';

describe('BookingCheckoutPage', () => {
  let component: BookingCheckoutPage;
  let fixture: ComponentFixture<BookingCheckoutPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingCheckoutPage],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingCheckoutPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
