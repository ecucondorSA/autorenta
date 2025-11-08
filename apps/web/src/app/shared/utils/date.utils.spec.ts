import { formatDateRange } from './date.utils';

describe('Date Utils', () => {
  describe('formatDateRange', () => {
    it('should format a date range correctly for es-AR locale', () => {
      const from = '2025-11-01T12:00:00Z';
      const to = '2025-11-05T12:00:00Z';
      // Expected format depends on the node environment, but it should be consistent.
      // For es-AR, it's typically DD/MM/YYYY.
      expect(formatDateRange(from, to)).toBe('1/11/2025 - 5/11/2025');
    });

    it('should handle same start and end date', () => {
      const from = '2025-11-01T12:00:00Z';
      const to = '2025-11-01T12:00:00Z';
      expect(formatDateRange(from, to)).toBe('1/11/2025 - 1/11/2025');
    });
  });
});
