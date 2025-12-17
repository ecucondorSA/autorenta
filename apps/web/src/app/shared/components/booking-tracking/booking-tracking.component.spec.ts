import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingTrackingComponent } from './booking-tracking.component';

describe('BookingTrackingComponent', () => {
  let component: BookingTrackingComponent;
  let fixture: ComponentFixture<BookingTrackingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingTrackingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingTrackingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
