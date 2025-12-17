import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingCancellationService } from './booking-cancellation.service';

describe('BookingCancellationService', () => {
  let component: BookingCancellationService;
  let fixture: ComponentFixture<BookingCancellationService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingCancellationService],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingCancellationService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
