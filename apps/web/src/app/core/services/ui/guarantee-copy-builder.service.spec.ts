import { TestBed } from '@angular/core/testing';
import { GuaranteeCopyBuilderService } from '@core/services/ui/guarantee-copy-builder.service';
import { testProviders } from '@app/testing/test-providers';

describe('GuaranteeCopyBuilderService', () => {
  let service: GuaranteeCopyBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, GuaranteeCopyBuilderService],
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
