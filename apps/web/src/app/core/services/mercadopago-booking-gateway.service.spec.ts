import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MercadoPagoBookingGatewayService } from './mercadopago-booking-gateway.service';

describe('MercadoPagoBookingGatewayService', () => {
  let component: MercadoPagoBookingGatewayService;
  let fixture: ComponentFixture<MercadoPagoBookingGatewayService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MercadoPagoBookingGatewayService],
    }).compileComponents();

    fixture = TestBed.createComponent(MercadoPagoBookingGatewayService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
