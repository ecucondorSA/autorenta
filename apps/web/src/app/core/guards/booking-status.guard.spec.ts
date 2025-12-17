import { ComponentFixture, TestBed } from '@angular/core/testing';
import { booking-status.guard } from './booking-status.guard';

describe('booking-status.guard', () => {
  let component: booking-status.guard;
  let fixture: ComponentFixture<booking-status.guard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [booking-status.guard],
    }).compileComponents();

    fixture = TestBed.createComponent(booking-status.guard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
