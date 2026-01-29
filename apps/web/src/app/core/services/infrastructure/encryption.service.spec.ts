import { TestBed } from '@angular/core/testing';
import { EncryptionService } from '@core/services/infrastructure/encryption.service';
import { testProviders } from '@app/testing/test-providers';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, EncryptionService],
    });
    service = TestBed.inject(EncryptionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have encrypt method', () => {
    expect(typeof service.encrypt).toBe('function');
  });

  it('should have decrypt method', () => {
    expect(typeof service.decrypt).toBe('function');
  });
});
