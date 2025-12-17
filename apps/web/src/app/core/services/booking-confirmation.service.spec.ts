import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingConfirmationService } from './booking-confirmation.service';

describe('BookingConfirmationService', () => {
  let component: BookingConfirmationService;
  let fixture: ComponentFixture<BookingConfirmationService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingConfirmationService],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingConfirmationService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
