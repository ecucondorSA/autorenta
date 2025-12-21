import { TestBed } from '@angular/core/testing';
import { FgoPolicyEngineService } from '@core/services/verification/fgo-policy-engine.service';

describe('FgoPolicyEngineService', () => {
  let service: FgoPolicyEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FgoPolicyEngineService]
    });
    service = TestBed.inject(FgoPolicyEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have evaluatePolicy method', () => {
    expect(typeof service.evaluatePolicy).toBe('function');
  });

  it('should have calculateContribution method', () => {
    expect(typeof service.calculateContribution).toBe('function');
  });

  it('should have validatePayout method', () => {
    expect(typeof service.validatePayout).toBe('function');
  });

});
