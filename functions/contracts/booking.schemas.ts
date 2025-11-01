
import { z } from 'zod';

export const BookingStatus = z.enum(['pending_payment', 'confirmed', 'cancelled']);
export const Currency = z.enum(['ARS', 'USD']);

export const BookingCreateSchema = z.object({
  car_id: z.string().uuid(),
  renter_id: z.string().uuid(),
  start_date: z.string().date().or(z.string().datetime()), // si usás ISO
  end_date: z.string().date().or(z.string().datetime()),
  pickup_location_id: z.string().uuid().optional(),
  dropoff_location_id: z.string().uuid().optional(),
}).strict();

export const BookingResponseSchema = z.object({
  booking_id: z.string().uuid(),
  status: BookingStatus,
  car_id: z.string().uuid(),
  renter_id: z.string().uuid(),
  amount_cents: z.number().int().nonnegative(),
  currency: Currency,
  created_at: z.string().datetime(),
}).strict();

export const PaymentPreferenceSchema = z.object({
  preference_id: z.string(),
  init_point: z.string().url(),
  amount_cents: z.number().int().positive(),
  currency: Currency,
}).strict();

export const ReceiptSchema = BookingResponseSchema.extend({
  receipt_url: z.string().url().optional(),
});
