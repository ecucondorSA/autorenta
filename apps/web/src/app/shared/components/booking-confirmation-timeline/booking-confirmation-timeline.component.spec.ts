import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingConfirmationTimelineComponent } from './booking-confirmation-timeline.component';

describe('BookingConfirmationTimelineComponent', () => {
  let component: BookingConfirmationTimelineComponent;
  let fixture: ComponentFixture<BookingConfirmationTimelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingConfirmationTimelineComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingConfirmationTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
