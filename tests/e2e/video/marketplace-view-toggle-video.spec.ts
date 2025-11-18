import { expect, Page, test } from '@playwright/test';

async function performSlowScroll(page: Page, steps = 12, delta = 260, pause = 1100): Promise<void> {
  for (let i = 0; i < steps; i += 1) {
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(pause);
  }
}

async function moveMouseSmooth(
  page: Page,
  points: Array<{ x: number; y: number; steps?: number; pause?: number }>
): Promise<void> {
  for (const { x, y, steps = 45, pause = 1000 } of points) {
    await page.mouse.move(x, y, { steps });
    await page.waitForTimeout(pause);
  }
}

async function closePriceTransparencyModal(page: Page): Promise<void> {
  const modal = page.locator('app-price-transparency-modal');
  if ((await modal.count()) === 0) {
    return;
  }

  const understoodButton = modal.locator(
    'button:has-text("Entendido"), button.w-full.py-4.px-6.bg-cta-default'
  );

  if (await understoodButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await understoodButton.first().click();
    await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => { });
    await page.waitForTimeout(600);
  }
}

test.describe('Video: splash + modos de vista', () => {
  test('recorre hero, vistas y conversa con el anfitrión', async ({ page }) => {
    test.slow();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Asegurar que el splash (video) se vea completo antes de continuar
    const splash = page.locator('app-splash-loader');
    if (await splash.count()) {
      await page.waitForTimeout(4500); // duración del video + animaciones
      await splash.waitFor({ state: 'detached', timeout: 12000 }).catch(() => { });
    }

    await closePriceTransparencyModal(page);
    await page.waitForTimeout(1500);

    // Entrar en pantalla completa (F11) para el video final
    await page.evaluate(() => {
      const docEl = document.documentElement as HTMLElement & { requestFullscreen?: () => Promise<void> };
      return docEl.requestFullscreen ? docEl.requestFullscreen().catch(() => { }) : undefined;
    }).catch(() => { });
    await page.keyboard.press('F11').catch(() => { });
    await page.waitForTimeout(2000);

    // Scroll cinematográfico por el hero hasta llegar al bloque de "Autos cerca de ti"
    await performSlowScroll(page, 14, 280, 1250);

    // Paneo suave horizontal para simular cámara (relativo al viewport actual)
    const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
    const panPoints = [
      { x: Math.round(viewport.width * 0.85), y: Math.round(viewport.height * 0.28), steps: 55, pause: 1500 },
      { x: Math.round(viewport.width * 0.2), y: Math.round(viewport.height * 0.35), steps: 55, pause: 1500 },
      { x: Math.round(viewport.width * 0.55), y: Math.round(viewport.height * 0.22), steps: 60, pause: 1700 },
    ];
    await moveMouseSmooth(page, panPoints);

    const nearbyHeading = page.getByRole('heading', { name: /Autos cerca de ti/i });
    await nearbyHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2200);

    const gridButton = page.locator('button:has-text("▦")').first();
    const listButton = page.locator('button:has-text("☰")').first();
    const mapButton = page.locator('button:has-text("🗺")').first();

    await expect(gridButton).toBeVisible();
    await expect(listButton).toBeVisible();
    await expect(mapButton).toBeVisible();

    // Click en Lista y espera para capturar la transición
    await listButton.hover();
    await page.waitForTimeout(1500);
    await listButton.click();
    await page.waitForTimeout(4000);
    await expect(listButton).toHaveClass(/bg-cta-default/, { timeout: 5000 }).catch(() => { });

    // Click en Mapa y espera para capturar el mapa
    await mapButton.hover();
    await page.waitForTimeout(1500);
    await mapButton.click();
    await page.waitForTimeout(4500);
    await expect(mapButton).toHaveClass(/bg-cta-default/, { timeout: 5000 }).catch(() => { });
    await expect(page.locator('app-cars-map')).toBeVisible({ timeout: 5000 });

    // Breve pausa final para que el video grabe el mapa activo
    await page.waitForTimeout(6000);

    // Volver a lista para abrir la ficha del auto
    await listButton.hover();
    await page.waitForTimeout(1500);
    await listButton.click();
    await page.waitForTimeout(4000);

    const firstListCard = page.locator('.car-card-enhanced').first();
    await firstListCard.hover();
    await page.waitForTimeout(1600);
    await firstListCard.click();
    await page.waitForTimeout(2500);

    const drawer = page.locator('.cars-drawer.cars-drawer--open');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    const drawerDetailsLink = drawer.locator('a:has-text("Ver Detalles")').first();
    await drawerDetailsLink.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await Promise.all([
      page.waitForURL('**/cars/**', { timeout: 20000 }),
      drawerDetailsLink.click(),
    ]);

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    await performSlowScroll(page, 8, 220, 1200);

    const contactButton = page.locator('button:has-text("Contactar Anfitrión")');
    if (await contactButton.isVisible({ timeout: 4000 }).catch(() => false)) {
      await contactButton.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1600);
      await Promise.all([
        page.waitForURL('**/messages/chat**', { timeout: 20000 }),
        contactButton.click(),
      ]);
      await page.waitForTimeout(5000);
    } else {
      const loginPrompt = page.locator('a:has-text("Inicia sesión para contactar")').first();
      if (await loginPrompt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await loginPrompt.scrollIntoViewIfNeeded();
        await page.waitForTimeout(2000);
      }
    }
  });
});

