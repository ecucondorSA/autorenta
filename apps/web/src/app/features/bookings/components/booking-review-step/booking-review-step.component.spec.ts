import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingReviewStepComponent } from './booking-review-step.component';

describe('BookingReviewStepComponent', () => {
  let component: BookingReviewStepComponent;
  let fixture: ComponentFixture<BookingReviewStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingReviewStepComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingReviewStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
