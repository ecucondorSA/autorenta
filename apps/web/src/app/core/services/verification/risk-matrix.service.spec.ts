import { TestBed } from '@angular/core/testing';
import { RiskMatrixService } from '@core/services/verification/risk-matrix.service';

describe('RiskMatrixService', () => {
  let service: RiskMatrixService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RiskMatrixService]
    });
    service = TestBed.inject(RiskMatrixService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getRiskPolicy method', () => {
    expect(typeof service.getRiskPolicy).toBe('function');
  });

  it('should have calculateFranchise method', () => {
    expect(typeof service.calculateFranchise).toBe('function');
  });

  it('should have calculateGuarantee method', () => {
    expect(typeof service.calculateGuarantee).toBe('function');
  });

});
