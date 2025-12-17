import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingInsuranceSummaryComponent } from './booking-insurance-summary.component';

describe('BookingInsuranceSummaryComponent', () => {
  let component: BookingInsuranceSummaryComponent;
  let fixture: ComponentFixture<BookingInsuranceSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingInsuranceSummaryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingInsuranceSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
