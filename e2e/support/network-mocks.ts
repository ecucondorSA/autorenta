import type { Page, Route } from '@playwright/test';
import { loadBookingsFixture, loadCarsFixture } from './fixtures';

const parseIlikeValue = (raw: string | null): string | null => {
  if (!raw) return null;
  const [, value] = raw.split('ilike.');
  if (!value) return raw;
  return value.replace(/\*/g, '').toLowerCase();
};

const parseInList = (raw: string | null): string[] => {
  if (!raw) return [];
  const match = raw.match(/\((.*?)\)/);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((value) => value.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
};

const fulfillJson = async (route: Route, data: unknown) => {
  const body = JSON.stringify(data);
  const headers: Record<string, string> = {
    'access-control-allow-origin': '*',
  };

  if (Array.isArray(data)) {
    headers['access-control-expose-headers'] = 'content-range';
    headers['content-range'] = `0-${Math.max(0, data.length - 1)}/${data.length}`;
  }

  await route.fulfill({
    status: 200,
    body,
    contentType: 'application/json',
    headers,
  });
};

export const installSupabaseMocks = async (page: Page) => {
  const carsFixture = loadCarsFixture();
  const bookingsFixture = loadBookingsFixture();

  await page.route('**/rest/v1/cars**', async (route, request) => {
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }

    const url = new URL(request.url());
    const cityFilter = parseIlikeValue(url.searchParams.get('location_city'));
    const idEqParam = url.searchParams.get('id');
    const orderParam = url.searchParams.get('order');

    let cars = [...carsFixture];

    if (idEqParam?.startsWith('eq.')) {
      const id = idEqParam.slice(3);
      cars = cars.filter((car) => car.id === id);
    }

    if (cityFilter && !idEqParam) {
      cars = cars.filter((car) => (car.location_city ?? '').toLowerCase().includes(cityFilter));
    }

    if (orderParam?.includes('price_per_day')) {
      const direction = orderParam.includes('.asc') ? 1 : -1;
      cars.sort((a, b) => (a.price_per_day - b.price_per_day) * direction);
    }

    await fulfillJson(route, idEqParam ? (cars[0] ?? null) : cars);
  });

  await page.route('**/rest/v1/bookings**', async (route, request) => {
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }

    const url = new URL(request.url());
    const carIds = parseInList(url.searchParams.get('car_id'));
    const statuses = parseInList(url.searchParams.get('status')).map((s) => s.toLowerCase());

    let bookings = bookingsFixture;

    if (carIds.length > 0) {
      bookings = bookings.filter((booking) => booking.car_id && carIds.includes(booking.car_id));
    }

    if (statuses.length > 0) {
      bookings = bookings.filter(
        (booking) => booking.status && statuses.includes(booking.status.toLowerCase()),
      );
    }

    await fulfillJson(route, bookings);
  });

  await page.route('**/auth/v1/**', async (route, request) => {
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }

    await route.fulfill({
      status: 401,
      body: JSON.stringify({ error: 'E2E mock: unauthenticated' }),
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': '*',
      },
    });
  });
};
