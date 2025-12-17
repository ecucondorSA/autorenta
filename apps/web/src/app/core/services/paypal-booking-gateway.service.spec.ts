import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayPalBookingGatewayService } from './paypal-booking-gateway.service';

describe('PayPalBookingGatewayService', () => {
  let component: PayPalBookingGatewayService;
  let fixture: ComponentFixture<PayPalBookingGatewayService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayPalBookingGatewayService],
    }).compileComponents();

    fixture = TestBed.createComponent(PayPalBookingGatewayService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
