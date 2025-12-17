import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingSuccessPage } from './booking-success.page';

describe('BookingSuccessPage', () => {
  let component: BookingSuccessPage;
  let fixture: ComponentFixture<BookingSuccessPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingSuccessPage],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingSuccessPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
