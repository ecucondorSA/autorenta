import { ComponentFixture, TestBed } from '@angular/core/testing';
import { date.utils } from './date.utils';

describe('date.utils', () => {
  let component: date.utils;
  let fixture: ComponentFixture<date.utils>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [date.utils],
    }).compileComponents();

    fixture = TestBed.createComponent(date.utils);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
