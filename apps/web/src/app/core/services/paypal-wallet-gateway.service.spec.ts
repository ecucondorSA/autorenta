import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayPalWalletGatewayService } from './paypal-wallet-gateway.service';

describe('PayPalWalletGatewayService', () => {
  let component: PayPalWalletGatewayService;
  let fixture: ComponentFixture<PayPalWalletGatewayService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayPalWalletGatewayService],
    }).compileComponents();

    fixture = TestBed.createComponent(PayPalWalletGatewayService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
