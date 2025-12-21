import { TestBed } from '@angular/core/testing';
import { ThemeService } from '@core/services/infrastructure/theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ThemeService]
    });
    service = TestBed.inject(ThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have setTheme method', () => {
    expect(typeof service.setTheme).toBe('function');
  });

  it('should have toggleTheme method', () => {
    expect(typeof service.toggleTheme).toBe('function');
  });

  it('should have cycleTheme method', () => {
    expect(typeof service.cycleTheme).toBe('function');
  });

  it('should have getThemeIcon method', () => {
    expect(typeof service.getThemeIcon).toBe('function');
  });

  it('should have getThemeLabel method', () => {
    expect(typeof service.getThemeLabel).toBe('function');
  });

});
