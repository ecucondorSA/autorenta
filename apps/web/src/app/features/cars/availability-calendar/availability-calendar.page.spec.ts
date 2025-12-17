import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvailabilityCalendarPage } from './availability-calendar.page';

describe('AvailabilityCalendarPage', () => {
  let component: AvailabilityCalendarPage;
  let fixture: ComponentFixture<AvailabilityCalendarPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvailabilityCalendarPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AvailabilityCalendarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
