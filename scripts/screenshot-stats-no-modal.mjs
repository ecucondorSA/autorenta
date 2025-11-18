#!/usr/bin/env node

import { chromium } from 'playwright';
import { resolve } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log('📸 Capturando stats bar sin modal de precio...\n');

    // Navegar
    await page.goto(`${BASE_URL}/marketplace`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Cerrar modal buscando el botón X específicamente
    console.log('🚫 Buscando y cerrando modal de precio...');

    // Intentar cerrar con ESC
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Si aún hay modal visible, buscar el botón cerrar
    try {
      const closeBtn = page.locator('app-price-transparency-modal button[type="button"]').first();
      const isVisible = await closeBtn.isVisible({ timeout: 1000 }).catch(() => false);
      if (isVisible) {
        console.log('  → Encontrado botón de cierre, haciendo click...');
        await closeBtn.click({ timeout: 2000 });
        await page.waitForTimeout(500);
      }
    } catch (e) {
      console.log('  → Modal ya cerrado o no encontrado');
    }

    // Verificar que no hay overlay fijo
    await page.evaluate(() => {
      const overlays = document.querySelectorAll('div[class*="fixed"], div[class*="modal"], app-price-transparency-modal');
      overlays.forEach(el => {
        if (el.style.display !== 'none') {
          console.log('Ocultando:', el.className);
          el.style.display = 'none';
        }
      });
    });

    await page.waitForTimeout(500);

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

      const statsPath = resolve('/tmp/marketplace-screenshots', 'STATS_BAR_FINAL.png');
      await page.screenshot({ path: statsPath, clip });
      console.log('\n✅ STATS_BAR_FINAL.png capturada');
      console.log(`   Dimensiones: ${Math.round(clip.width)}x${Math.round(clip.height)}px`);
      console.log(`   Ubicación: x=${Math.round(clip.x)}, y=${Math.round(clip.y)}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

capture();
