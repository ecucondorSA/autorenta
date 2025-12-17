import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingValidationService } from './booking-validation.service';

describe('BookingValidationService', () => {
  let component: BookingValidationService;
  let fixture: ComponentFixture<BookingValidationService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingValidationService],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingValidationService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
