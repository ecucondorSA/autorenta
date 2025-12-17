import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UrgentBookingPage } from './urgent-booking.page';

describe('UrgentBookingPage', () => {
  let component: UrgentBookingPage;
  let fixture: ComponentFixture<UrgentBookingPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UrgentBookingPage],
    }).compileComponents();

    fixture = TestBed.createComponent(UrgentBookingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
