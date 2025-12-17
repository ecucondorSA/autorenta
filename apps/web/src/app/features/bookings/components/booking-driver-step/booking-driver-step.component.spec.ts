import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingDriverStepComponent } from './booking-driver-step.component';

describe('BookingDriverStepComponent', () => {
  let component: BookingDriverStepComponent;
  let fixture: ComponentFixture<BookingDriverStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingDriverStepComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingDriverStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
