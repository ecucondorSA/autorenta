import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingPickerPage } from './booking-picker.page';

describe('BookingPickerPage', () => {
  let component: BookingPickerPage;
  let fixture: ComponentFixture<BookingPickerPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingPickerPage],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingPickerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
