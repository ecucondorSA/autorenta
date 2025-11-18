import { expect, Page, test } from '@playwright/test';

async function waitForSplashToDisappear(page: Page): Promise<void> {
  const splash = page.locator('app-splash-loader');
  if ((await splash.count()) === 0) {
    return;
  }
  await splash.waitFor({ state: 'detached', timeout: 12_000 }).catch(() => {});
}

async function dismissOverlays(page: Page): Promise<void> {
  await waitForSplashToDisappear(page);

  const priceModal = page.locator('app-price-transparency-modal');
  if (await priceModal.isVisible({ timeout: 500 }).catch(() => false)) {
    await priceModal.getByRole('button', { name: /Entendido/i }).click();
    await priceModal.waitFor({ state: 'hidden' }).catch(() => {});
  }

  // Oculta la bottom-nav en mobile con un scroll mínimo
  await page.mouse.wheel(0, 200);
}

test.describe('Marketplace → Contacto con anfitrión', () => {
  test('usuario autenticado puede abrir ficha y contactar al anfitrión', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissOverlays(page);

    await expect(page.getByRole('heading', { name: /Encuentra tu auto ideal/i })).toBeVisible();

    const listToggle = page.locator('button:has-text("☰")').first();
    await listToggle.click();

    const firstCard = page.locator('.car-card-enhanced').first();
    await expect(firstCard).toBeVisible();

    const detailsButton = firstCard.getByRole('button', { name: /Ver detalles/i });
    await detailsButton.click();

    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/cars\//);

    const contactButton = page.getByRole('button', { name: /Contactar Anfitrión/i });
    await expect(contactButton).toBeVisible();
    await contactButton.click();

    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/messages\/chat/);
    await expect(page.getByText(/Chat|Mensajes/i).first()).toBeVisible();
  });
});

