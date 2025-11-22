#!/usr/bin/env node

import { chromium } from 'playwright';
import { resolve } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log('📸 Capturando calendar en hero section...\n');

    // Navegar
    await page.goto(`${BASE_URL}/marketplace`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    // Cerrar modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Verificar que el calendar se renderizó
    const calendarSelector = 'app-date-range-picker';
    const calendarExists = await page.$(calendarSelector);

    if (calendarExists) {
      console.log('✅ app-date-range-picker encontrado en el DOM\n');

      // Capturar el search card completo
      const searchCard = await page.locator('div.bg-white.dark\\:bg-slate-800.backdrop-blur-xl').boundingBox();

      if (searchCard) {
        const outputPath = resolve('/tmp/marketplace-screenshots', 'calendar-hero-search.png');
        await page.screenshot({
          path: outputPath,
          clip: {
            x: Math.max(0, searchCard.x - 20),
            y: Math.max(0, searchCard.y - 20),
            width: searchCard.width + 40,
            height: searchCard.height + 40
          }
        });
        console.log('✅ Search card con calendario: calendar-hero-search.png');
        console.log(`   Dimensiones: ${Math.round(searchCard.width)}x${Math.round(searchCard.height)}px\n`);
      }

      // Capturar página completa
      const fullPath = resolve('/tmp/marketplace-screenshots', 'marketplace-with-calendar.png');
      await page.screenshot({ path: fullPath, fullPage: false });
      console.log('✅ Página completa: marketplace-with-calendar.png');
    } else {
      console.log('⚠️  Calendar component no encontrado');
    }

    console.log('\n✨ Capturas completadas!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

capture();
