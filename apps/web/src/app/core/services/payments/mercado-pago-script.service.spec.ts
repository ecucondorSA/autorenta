import { TestBed } from '@angular/core/testing';
import { MercadoPagoScriptService } from '@core/services/payments/mercado-pago-script.service';
import { testProviders } from '@app/testing/test-providers';

describe('MercadoPagoScriptService', () => {
  let service: MercadoPagoScriptService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, MercadoPagoScriptService],
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
