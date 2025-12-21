import { TestBed } from '@angular/core/testing';
import { ContractTemplateService } from './contract-template.service';

describe('ContractTemplateService', () => {
  let service: ContractTemplateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ContractTemplateService]
    });
    service = TestBed.inject(ContractTemplateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have loadTemplate method', () => {
    expect(typeof service.loadTemplate).toBe('function');
  });

  it('should have mergeData method', () => {
    expect(typeof service.mergeData).toBe('function');
  });

  it('should have validateMerge method', () => {
    expect(typeof service.validateMerge).toBe('function');
  });

  it('should have extractPlaceholders method', () => {
    expect(typeof service.extractPlaceholders).toBe('function');
  });

});
