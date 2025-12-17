import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MercadoPagoOAuthService } from './mercadopago-oauth.service';

describe('MercadoPagoOAuthService', () => {
  let component: MercadoPagoOAuthService;
  let fixture: ComponentFixture<MercadoPagoOAuthService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MercadoPagoOAuthService],
    }).compileComponents();

    fixture = TestBed.createComponent(MercadoPagoOAuthService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
