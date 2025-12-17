import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarEventsListComponent } from './calendar-events-list.component';

describe('CalendarEventsListComponent', () => {
  let component: CalendarEventsListComponent;
  let fixture: ComponentFixture<CalendarEventsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarEventsListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarEventsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
