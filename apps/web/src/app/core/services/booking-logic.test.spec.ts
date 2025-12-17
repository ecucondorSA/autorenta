import { ComponentFixture, TestBed } from '@angular/core/testing';
import { booking-logic.test } from './booking-logic.test';

describe('booking-logic.test', () => {
  let component: booking-logic.test;
  let fixture: ComponentFixture<booking-logic.test>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [booking-logic.test],
    }).compileComponents();

    fixture = TestBed.createComponent(booking-logic.test);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
