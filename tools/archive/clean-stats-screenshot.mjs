#!/usr/bin/env node

import { chromium } from 'playwright';
import { resolve } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log('📸 Capturando stats bar limpia...\n');

    // Ir a marketplace
    await page.goto(`${BASE_URL}/marketplace`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Esperar a que carguen los elementos
    await page.waitForTimeout(2000);

    // Presionar ESC para cerrar modales
    console.log('🚫 Cerrando modales con ESC...');
    await page.press('body', 'Escape');
    await page.waitForTimeout(500);

    // Capturar toda la página
    const fullPagePath = resolve('/tmp/marketplace-screenshots', 'marketplace-final.png');
    await page.screenshot({ path: fullPagePath, fullPage: false });
    console.log('✅ marketplace-final.png\n');

    // Capturar la stats bar
    const statsBar = await page.locator('div.flex.items-center.justify-center.gap-4.md\\:gap-8.mb-8.flex-wrap').boundingBox();

    if (statsBar) {
      const padding = 50;
      const clip = {
        x: Math.max(0, statsBar.x - padding),
        y: Math.max(0, statsBar.y - padding),
        width: Math.min(1920, statsBar.width + padding * 2),
        height: statsBar.height + padding * 2
      };

      const statsPath = resolve('/tmp/marketplace-screenshots', 'stats-bar-final.png');
      await page.screenshot({ path: statsPath, clip });
      console.log('✅ stats-bar-final.png');
      const w = Math.round(clip.width);
      const h = Math.round(clip.height);
      console.log(`   Dimensiones: ${w}x${h}px`);
    }

    console.log('\n✨ Capturas completadas!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

capture();
