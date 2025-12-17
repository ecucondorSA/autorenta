import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingNotificationsService } from './booking-notifications.service';

describe('BookingNotificationsService', () => {
  let component: BookingNotificationsService;
  let fixture: ComponentFixture<BookingNotificationsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingNotificationsService],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingNotificationsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
