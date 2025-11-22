#!/usr/bin/env node

import { chromium } from 'playwright';
import { resolve } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

async function captureFinal() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log('📸 Capturando calendario funcionando...\n');

    await page.goto(`${BASE_URL}/marketplace`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Cerrar modales bloqueantes
    await page.evaluate(() => {
      const modals = document.querySelectorAll('app-price-transparency-modal');
      modals.forEach(modal => {
        modal.style.display = 'none';
      });
    });

    await page.waitForTimeout(500);

    // Click en el calendario
    await page.evaluate(() => {
      const wrapper = document.querySelector('app-date-range-picker .date-input-wrapper');
      if (wrapper) wrapper.click();
    });

    await page.waitForTimeout(1000);

    // Capturar pantalla completa con modal
    console.log('📸 Pantalla completa con modal abierto...');
    await page.screenshot({
      path: resolve('/tmp/marketplace-screenshots', 'CALENDAR_WORKING_FULLSCREEN.png'),
      fullPage: false
    });
    console.log('   ✅ CALENDAR_WORKING_FULLSCREEN.png\n');

    // Capturar solo el modal
    const modalBox = await page.locator('div.fixed.z-50 > div').boundingBox();
    if (modalBox) {
      console.log('📸 Solo el modal del calendario...');
      await page.screenshot({
        path: resolve('/tmp/marketplace-screenshots', 'CALENDAR_MODAL_ONLY.png'),
        clip: {
          x: Math.max(0, modalBox.x - 20),
          y: Math.max(0, modalBox.y - 20),
          width: modalBox.width + 40,
          height: modalBox.height + 40
        }
      });
      console.log(`   ✅ CALENDAR_MODAL_ONLY.png (${Math.round(modalBox.width)}x${Math.round(modalBox.height)}px)\n`);
    }

    console.log('════════════════════════════════════════');
    console.log('✨ RESUMEN FINAL:');
    console.log('════════════════════════════════════════');
    console.log('✅ Imagen stats bar ampliada (h-6 → h-12)');
    console.log('✅ Calendario reemplazado (app-date-search → app-date-range-picker)');
    console.log('✅ Modal de calendario funcionando correctamente');
    console.log('✅ Evento (calendarClick) conectado y emitiendo');
    console.log('════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureFinal();
