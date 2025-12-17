import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingOpsTimelineComponent } from './booking-ops-timeline.component';

describe('BookingOpsTimelineComponent', () => {
  let component: BookingOpsTimelineComponent;
  let fixture: ComponentFixture<BookingOpsTimelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingOpsTimelineComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingOpsTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
