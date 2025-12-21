import { TestBed } from '@angular/core/testing';
import { FranchiseTableService } from './franchise-table.service';

describe('FranchiseTableService', () => {
  let service: FranchiseTableService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FranchiseTableService]
    });
    service = TestBed.inject(FranchiseTableService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getStandardFranchiseUsd method', () => {
    expect(typeof service.getStandardFranchiseUsd).toBe('function');
  });

  it('should have getRolloverFranchiseUsd method', () => {
    expect(typeof service.getRolloverFranchiseUsd).toBe('function');
  });

  it('should have calculateHoldArs method', () => {
    expect(typeof service.calculateHoldArs).toBe('function');
  });

  it('should have getSecurityCreditUsd method', () => {
    expect(typeof service.getSecurityCreditUsd).toBe('function');
  });

  it('should have getFranchiseInfo method', () => {
    expect(typeof service.getFranchiseInfo).toBe('function');
  });

  it('should have shouldRevalidate method', () => {
    expect(typeof service.shouldRevalidate).toBe('function');
  });

  it('should have formatArs method', () => {
    expect(typeof service.formatArs).toBe('function');
  });

  it('should have formatUsd method', () => {
    expect(typeof service.formatUsd).toBe('function');
  });

});
