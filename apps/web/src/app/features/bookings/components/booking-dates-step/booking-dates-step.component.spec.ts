import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingDatesStepComponent } from './booking-dates-step.component';

describe('BookingDatesStepComponent', () => {
  let component: BookingDatesStepComponent;
  let fixture: ComponentFixture<BookingDatesStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingDatesStepComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingDatesStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
