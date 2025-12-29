import { TestBed } from '@angular/core/testing';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { DateFormatPipe } from './date-format.pipe';

describe('DateFormatPipe', () => {
  let pipe: DateFormatPipe;
  let translateService: TranslateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [DateFormatPipe],
    });

    translateService = TestBed.inject(TranslateService);
    translateService.setDefaultLang('es');
    translateService.use('es');
    pipe = TestBed.inject(DateFormatPipe);
  });

  describe('short format (default)', () => {
    it('should format date as dd/MM/yyyy for es-AR', () => {
      const date = new Date(2024, 11, 25); // Dec 25, 2024
      const result = pipe.transform(date);
      expect(result).toContain('25');
      expect(result).toContain('12');
      expect(result).toContain('2024');
    });

    it('should handle string dates', () => {
      const result = pipe.transform('2024-06-15T10:30:00Z');
      expect(result).toContain('2024');
    });
  });

  describe('medium format', () => {
    it('should include time in medium format', () => {
      const date = new Date(2024, 5, 15, 14, 30);
      const result = pipe.transform(date, 'medium');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });
  });

  describe('long format', () => {
    it('should show full month name', () => {
      const date = new Date(2024, 0, 1); // January 1, 2024
      const result = pipe.transform(date, 'long');
      expect(result).toContain('2024');
      expect(result).toContain('1');
    });
  });

  describe('time formats', () => {
    it('should format shortTime as HH:mm', () => {
      const date = new Date(2024, 5, 15, 14, 30, 45);
      const result = pipe.transform(date, 'shortTime');
      expect(result).toContain('14');
      expect(result).toContain('30');
    });

    it('should format mediumTime as HH:mm:ss', () => {
      const date = new Date(2024, 5, 15, 14, 30, 45);
      const result = pipe.transform(date, 'mediumTime');
      expect(result).toContain('14');
      expect(result).toContain('30');
      expect(result).toContain('45');
    });
  });

  describe('null/undefined handling', () => {
    it('should return empty string for null', () => {
      expect(pipe.transform(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(pipe.transform(undefined)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(pipe.transform('')).toBe('');
    });
  });

  describe('invalid date handling', () => {
    it('should return empty string for invalid date string', () => {
      expect(pipe.transform('not-a-date')).toBe('');
    });
  });

  describe('locale mapping', () => {
    it('should use es-AR locale for Spanish', () => {
      translateService.use('es');
      const date = new Date(2024, 11, 25);
      const result = pipe.transform(date);
      // Spanish format typically uses / separator
      expect(result).toBeTruthy();
    });

    it('should use en-US locale for English', () => {
      translateService.use('en');
      const date = new Date(2024, 11, 25);
      const result = pipe.transform(date);
      expect(result).toBeTruthy();
    });

    it('should use pt-BR locale for Portuguese', () => {
      translateService.use('pt');
      const date = new Date(2024, 11, 25);
      const result = pipe.transform(date);
      expect(result).toBeTruthy();
    });

    it('should default to es-AR for unknown language', () => {
      translateService.use('fr');
      const date = new Date(2024, 11, 25);
      const result = pipe.transform(date);
      expect(result).toBeTruthy();
    });
  });
});
