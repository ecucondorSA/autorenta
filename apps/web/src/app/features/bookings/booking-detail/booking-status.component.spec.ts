import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingStatusComponent } from './booking-status.component';

describe('BookingStatusComponent', () => {
  let component: BookingStatusComponent;
  let fixture: ComponentFixture<BookingStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingStatusComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
