import { TestBed } from '@angular/core/testing';
import { GuaranteeCopyBuilderService } from './guarantee-copy-builder.service';

describe('GuaranteeCopyBuilderService', () => {
  let service: GuaranteeCopyBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GuaranteeCopyBuilderService]
    });
    service = TestBed.inject(GuaranteeCopyBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have buildCheckoutCopy method', () => {
    expect(typeof service.buildCheckoutCopy).toBe('function');
  });

  it('should have buildSummaryLine method', () => {
    expect(typeof service.buildSummaryLine).toBe('function');
  });

});
