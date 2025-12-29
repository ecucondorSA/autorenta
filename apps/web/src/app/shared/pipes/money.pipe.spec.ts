import { MoneyPipe } from './money.pipe';

describe('MoneyPipe', () => {
  let pipe: MoneyPipe;

  beforeEach(() => {
    pipe = new MoneyPipe();
  });

  describe('USD formatting', () => {
    it('should format positive numbers as USD', () => {
      const result = pipe.transform(100);
      expect(result).toContain('$');
      expect(result).toContain('100');
    });

    it('should format with 2 decimal places for USD', () => {
      const result = pipe.transform(99.99);
      expect(result).toContain('99.99');
    });

    it('should handle zero', () => {
      const result = pipe.transform(0);
      expect(result).toContain('0');
    });

    it('should handle large numbers', () => {
      const result = pipe.transform(1000000);
      expect(result).toContain('1,000,000') || expect(result).toContain('1.000.000');
    });
  });

  describe('ARS formatting', () => {
    it('should format as ARS with es-AR locale', () => {
      const result = pipe.transform(1500, 'ARS');
      expect(result).toContain('$');
      expect(result).toContain('1');
    });

    it('should format without decimal places for ARS', () => {
      const result = pipe.transform(1500.75, 'ARS');
      // ARS should have 0 decimal places
      expect(result).not.toContain('.75');
    });
  });

  describe('null/undefined handling', () => {
    it('should return dash for null', () => {
      expect(pipe.transform(null)).toBe('-');
    });

    it('should return dash for undefined', () => {
      expect(pipe.transform(undefined)).toBe('-');
    });
  });

  describe('edge cases', () => {
    it('should handle negative numbers', () => {
      const result = pipe.transform(-50);
      expect(result).toContain('50');
      expect(result).toContain('-');
    });

    it('should handle very small numbers', () => {
      const result = pipe.transform(0.01);
      expect(result).toContain('0.01');
    });
  });
});
