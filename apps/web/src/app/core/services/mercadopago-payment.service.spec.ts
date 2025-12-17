import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MercadoPagoPaymentService } from './mercadopago-payment.service';

describe('MercadoPagoPaymentService', () => {
  let component: MercadoPagoPaymentService;
  let fixture: ComponentFixture<MercadoPagoPaymentService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MercadoPagoPaymentService],
    }).compileComponents();

    fixture = TestBed.createComponent(MercadoPagoPaymentService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
