import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MercadoPagoWalletGatewayService } from './mercadopago-wallet-gateway.service';

describe('MercadoPagoWalletGatewayService', () => {
  let component: MercadoPagoWalletGatewayService;
  let fixture: ComponentFixture<MercadoPagoWalletGatewayService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MercadoPagoWalletGatewayService],
    }).compileComponents();

    fixture = TestBed.createComponent(MercadoPagoWalletGatewayService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
