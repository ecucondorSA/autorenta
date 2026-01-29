import { TestBed } from '@angular/core/testing';
import { LanguageService } from '@core/services/ui/language.service';
import { testProviders } from '@app/testing/test-providers';

describe('LanguageService', () => {
  let service: LanguageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, LanguageService],
    });
    service = TestBed.inject(LanguageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have setLanguage method', () => {
    expect(typeof service.setLanguage).toBe('function');
  });

  it('should have instant method', () => {
    expect(typeof service.instant).toBe('function');
  });

  it('should have getCurrentLanguageName method', () => {
    expect(typeof service.getCurrentLanguageName).toBe('function');
  });

  it('should have getCurrentLanguageFlag method', () => {
    expect(typeof service.getCurrentLanguageFlag).toBe('function');
  });
});
