// Mock implementation for isAvailable for testing purposes
const isAvailable = (existingBookings: { start: string; end: string }[], newBooking: { start: string; end: string }): boolean => {
  const newStart = new Date(newBooking.start).getTime();
  const newEnd = new Date(newBooking.end).getTime();

  for (const existing of existingBookings) {
    const existingStart = new Date(existing.start).getTime();
    const existingEnd = new Date(existing.end).getTime();

    // Check for overlap
    if (newStart < existingEnd && newEnd > existingStart) {
      return false; // Overlap found
    }
  }
  return true; // No overlap
};

describe('availability', () => {
  it('no solapa reservas existentes', () => {
    const existing = [{ start: '2025-11-10', end: '2025-11-12' }];
    expect(isAvailable(existing, { start: '2025-11-12', end: '2025-11-14' })).toBe(true);
    expect(isAvailable(existing, { start: '2025-11-11', end: '2025-11-13' })).toBe(false);
  });
});