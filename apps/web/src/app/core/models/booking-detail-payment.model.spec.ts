import { ComponentFixture, TestBed } from '@angular/core/testing';
import { booking-detail-payment.model } from './booking-detail-payment.model';

describe('booking-detail-payment.model', () => {
  let component: booking-detail-payment.model;
  let fixture: ComponentFixture<booking-detail-payment.model>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [booking-detail-payment.model],
    }).compileComponents();

    fixture = TestBed.createComponent(booking-detail-payment.model);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
