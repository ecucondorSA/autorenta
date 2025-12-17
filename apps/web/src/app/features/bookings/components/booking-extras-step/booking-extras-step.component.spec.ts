import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingExtrasStepComponent } from './booking-extras-step.component';

describe('BookingExtrasStepComponent', () => {
  let component: BookingExtrasStepComponent;
  let fixture: ComponentFixture<BookingExtrasStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingExtrasStepComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingExtrasStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
