import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingStepIndicatorComponent } from './booking-step-indicator.component';

describe('BookingStepIndicatorComponent', () => {
  let component: BookingStepIndicatorComponent;
  let fixture: ComponentFixture<BookingStepIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingStepIndicatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingStepIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
