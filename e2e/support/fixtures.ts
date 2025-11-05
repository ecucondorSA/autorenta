import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fixturesRoot = resolve(__dirname, '..', '..', 'fixtures');

export const loadJsonFixture = <T>(name: string): T => {
  const filePath = resolve(fixturesRoot, name);
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
};

export const loadCarsFixture = () =>
  loadJsonFixture<Array<{
    id: string;
    title: string;
    brand_text_backup: string;
    model_text_backup: string;
    location_city: string | null;
    location_state: string | null;
    location_country: string | null;
    transmission: string;
    price_per_day: number;
    currency: string;
    deposit_amount: number | null;
    rating_avg: number | null;
    rating_count: number | null;
    photos: Array<{ url: string }>;
  }>>('cars.json');

export const loadBookingsFixture = () =>
  loadJsonFixture<
    Array<{
      id: string;
      car_id: string | null;
      start_at: string | null;
      end_at: string | null;
      status: string | null;
    }>
  >('bookings.json');
