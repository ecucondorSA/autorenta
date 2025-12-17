import { ComponentFixture, TestBed } from '@angular/core/testing';
import { booking-flow-helpers } from './booking-flow-helpers';

describe('booking-flow-helpers', () => {
  let component: booking-flow-helpers;
  let fixture: ComponentFixture<booking-flow-helpers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [booking-flow-helpers],
    }).compileComponents();

    fixture = TestBed.createComponent(booking-flow-helpers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
