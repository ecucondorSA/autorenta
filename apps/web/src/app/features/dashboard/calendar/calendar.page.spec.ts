import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardCalendarPage } from './calendar.page';

describe('DashboardCalendarPage', () => {
  let component: DashboardCalendarPage;
  let fixture: ComponentFixture<DashboardCalendarPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardCalendarPage],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardCalendarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
