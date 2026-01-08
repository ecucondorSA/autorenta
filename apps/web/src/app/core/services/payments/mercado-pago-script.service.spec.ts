import { TestBed } from '@angular/core/testing';
import { MercadoPagoScriptService } from '@core/services/payments/mercado-pago-script.service';

describe('MercadoPagoScriptService', () => {
  let service: MercadoPagoScriptService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MercadoPagoScriptService],
    });
    service = TestBed.inject(MercadoPagoScriptService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getMercadoPago method', () => {
    expect(typeof service.getMercadoPago).toBe('function');
  });
});
