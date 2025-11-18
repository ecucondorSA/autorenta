#!/usr/bin/env node

import { chromium } from 'playwright';
import { resolve } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log('📸 Capturando calendario sin modales...\n');

    // Navegar
    await page.goto(`${BASE_URL}/marketplace`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Ocultar modales con JavaScript
    await page.evaluate(() => {
      const modals = document.querySelectorAll('app-price-transparency-modal, [class*="fixed"][class*="inset"]');
      modals.forEach(modal => {
        modal.style.display = 'none';
      });
    });

    await page.waitForTimeout(500);

    // Capturar la tarjeta de búsqueda con el calendario
    const searchCard = await page.locator('div.bg-white.dark\\:bg-slate-800.backdrop-blur-xl.rounded-3xl').first().boundingBox();

    if (searchCard) {
      const outputPath = resolve('/tmp/marketplace-screenshots', 'CALENDAR_HERO_SEARCH_CLEAN.png');
      const clip = {
        x: Math.max(0, searchCard.x - 30),
        y: Math.max(0, searchCard.y - 30),
        width: Math.min(1920, searchCard.width + 60),
        height: searchCard.height + 60
      };

      await page.screenshot({ path: outputPath, clip });
      console.log('✅ CALENDAR_HERO_SEARCH_CLEAN.png');
      console.log(`   Dimensiones: ${Math.round(clip.width)}x${Math.round(clip.height)}px`);
      console.log(`   Contiene: app-date-range-picker (calendario inline)\n`);
    }

    // Capturar la sección hero completa
    const heroSection = await page.locator('.hero-header').boundingBox();
    if (heroSection) {
      const outputPath = resolve('/tmp/marketplace-screenshots', 'MARKETPLACE_HERO_WITH_CALENDAR.png');
      await page.screenshot({
        path: outputPath,
        clip: heroSection
      });
      console.log('✅ MARKETPLACE_HERO_WITH_CALENDAR.png');
      console.log(`   Dimensiones: ${Math.round(heroSection.width)}x${Math.round(heroSection.height)}px`);
    }

    console.log('\n✨ Cambio completado: app-date-search → app-date-range-picker');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

capture();
