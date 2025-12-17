import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DateFormatPipe } from './date-format.pipe';

describe('DateFormatPipe', () => {
  let component: DateFormatPipe;
  let fixture: ComponentFixture<DateFormatPipe>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DateFormatPipe],
    }).compileComponents();

    fixture = TestBed.createComponent(DateFormatPipe);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
