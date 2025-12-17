import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MultiCarCalendarComponent } from './multi-car-calendar.component';

describe('MultiCarCalendarComponent', () => {
  let component: MultiCarCalendarComponent;
  let fixture: ComponentFixture<MultiCarCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiCarCalendarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MultiCarCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
