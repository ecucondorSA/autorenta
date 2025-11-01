
import { describe, it, expect } from 'vitest';
import { BookingCreateSchema, BookingResponseSchema, PaymentPreferenceSchema } from './booking.schemas';

describe('Booking contracts', () => {
  it('valid create', () => {
    const payload = {
      car_id: crypto.randomUUID(),
      renter_id: crypto.randomUUID(),
      start_date: '2025-11-10',
      end_date: '2025-11-12',
    };
    expect(() => BookingCreateSchema.parse(payload)).not.toThrow();
  });

  it('rejects unknown keys', () => {
    const bad: any = { car_id: crypto.randomUUID(), renter_id: crypto.randomUUID(), start_date: '2025-11-10', end_date: '2025-11-12', foo: 1 };
    expect(() => BookingCreateSchema.parse(bad)).toThrow();
  });

  it('payment preference schema ok', () => {
    const pref = { preference_id: 'abc', init_point: 'https://pay.example/123', amount_cents: 250000, currency: 'ARS' };
    expect(() => PaymentPreferenceSchema.parse(pref)).not.toThrow();
  });
});
