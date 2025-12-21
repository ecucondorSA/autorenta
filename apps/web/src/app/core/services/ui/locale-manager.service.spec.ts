import { TestBed } from '@angular/core/testing';
import { LocaleManagerService } from './locale-manager.service';

describe('LocaleManagerService', () => {
  let service: LocaleManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocaleManagerService]
    });
    service = TestBed.inject(LocaleManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have setLanguage method', () => {
    expect(typeof service.setLanguage).toBe('function');
  });

  it('should have getCurrentLanguage method', () => {
    expect(typeof service.getCurrentLanguage).toBe('function');
  });

  it('should have getCurrentLocale method', () => {
    expect(typeof service.getCurrentLocale).toBe('function');
  });

});
