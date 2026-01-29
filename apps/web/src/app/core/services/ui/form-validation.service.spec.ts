import { TestBed } from '@angular/core/testing';
import { FormValidationService } from '@core/services/ui/form-validation.service';
import { testProviders } from '@app/testing/test-providers';

describe('FormValidationService', () => {
  let service: FormValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, FormValidationService],
    });
    service = TestBed.inject(FormValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getErrorMessage method', () => {
    expect(typeof service.getErrorMessage).toBe('function');
  });
});
