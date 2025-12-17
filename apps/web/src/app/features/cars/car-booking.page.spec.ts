import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarBookingPage } from './car-booking.page';

describe('CarBookingPage', () => {
  let component: CarBookingPage;
  let fixture: ComponentFixture<CarBookingPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarBookingPage],
    }).compileComponents();

    fixture = TestBed.createComponent(CarBookingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
