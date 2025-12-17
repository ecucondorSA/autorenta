import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingPricingBreakdownComponent } from './booking-pricing-breakdown.component';

describe('BookingPricingBreakdownComponent', () => {
  let component: BookingPricingBreakdownComponent;
  let fixture: ComponentFixture<BookingPricingBreakdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingPricingBreakdownComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingPricingBreakdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
