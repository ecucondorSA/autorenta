import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingInsuranceStepComponent } from './booking-insurance-step.component';

describe('BookingInsuranceStepComponent', () => {
  let component: BookingInsuranceStepComponent;
  let fixture: ComponentFixture<BookingInsuranceStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingInsuranceStepComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingInsuranceStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
