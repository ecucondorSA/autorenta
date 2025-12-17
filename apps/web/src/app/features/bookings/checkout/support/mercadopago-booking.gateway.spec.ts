import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MercadoPagoBookingGateway } from './mercadopago-booking.gateway';

describe('MercadoPagoBookingGateway', () => {
  let component: MercadoPagoBookingGateway;
  let fixture: ComponentFixture<MercadoPagoBookingGateway>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MercadoPagoBookingGateway],
    }).compileComponents();

    fixture = TestBed.createComponent(MercadoPagoBookingGateway);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
