import { Page, Route } from '@playwright/test';

export async function mockMercadoPago(page: Page, opts: { status?: string; preferenceId?: string } = {}) {
  await page.route('**/mercadopago/**', (route: Route) => {
    const body = {
      id: opts.preferenceId || 'mock-pref-123',
      status: opts.status || 'approved',
    };
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}
