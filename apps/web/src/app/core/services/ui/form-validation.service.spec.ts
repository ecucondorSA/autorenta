import { TestBed } from '@angular/core/testing';
import { FormValidationService } from '@core/services/ui/form-validation.service';

describe('FormValidationService', () => {
  let service: FormValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FormValidationService],
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
