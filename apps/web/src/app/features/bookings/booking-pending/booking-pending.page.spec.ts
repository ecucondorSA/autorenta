import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingPendingPage } from './booking-pending.page';

describe('BookingPendingPage', () => {
  let component: BookingPendingPage;
  let fixture: ComponentFixture<BookingPendingPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingPendingPage],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingPendingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
