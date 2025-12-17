import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingConfirmationPage } from './booking-confirmation.page';

describe('BookingConfirmationPage', () => {
  let component: BookingConfirmationPage;
  let fixture: ComponentFixture<BookingConfirmationPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingConfirmationPage],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingConfirmationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
