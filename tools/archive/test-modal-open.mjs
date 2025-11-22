#!/usr/bin/env node

import { chromium } from 'playwright';
import { resolve } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

async function testModalOpen() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log('🔍 Probando apertura de modal de calendario...\n');

    await page.goto(`${BASE_URL}/marketplace`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    console.log('📸 Estado INICIAL...');
    await page.screenshot({ path: resolve('/tmp/marketplace-screenshots', 'modal-01-before.png') });
    console.log('   Guardado: modal-01-before.png\n');

    // Buscar el área clicable del calendario
    console.log('🎯 Buscando área clicable...');
    const clickableArea = await page.$('app-date-range-picker .date-input-wrapper');

    if (!clickableArea) {
      console.log('❌ No encontró .date-input-wrapper');
      console.log('   Intentando con el componente completo...');
      const calendar = await page.$('app-date-range-picker');
      if (calendar) {
        console.log('✅ Haciendo click en app-date-range-picker...');
        await calendar.click();
      } else {
        console.log('❌ No encontró app-date-range-picker');
        return;
      }
    } else {
      console.log('✅ Haciendo click en .date-input-wrapper...');
      await clickableArea.click();
    }

    await page.waitForTimeout(1000);

    console.log('\n📸 DESPUÉS del click...');
    await page.screenshot({ path: resolve('/tmp/marketplace-screenshots', 'modal-02-after-click.png') });
    console.log('   Guardado: modal-02-after-click.png\n');

    // Verificar si se abrió el modal
    console.log('🔍 Verificando si se abrió el modal...');
    const modal = await page.$('div[class*="fixed"][class*="z-50"]');

    if (modal) {
      console.log('✅ Modal ABIERTO!\n');

      // Buscar el calendario dentro del modal
      const calendarInModal = await page.$('div[class*="fixed"] app-date-range-picker');
      if (calendarInModal) {
        console.log('✅ app-date-range-picker encontrado dentro del modal\n');
      }

      // Esperar un poco más y capturar
      await page.waitForTimeout(500);
      console.log('📸 Modal completo...');
      await page.screenshot({
        path: resolve('/tmp/marketplace-screenshots', 'modal-03-full-modal.png'),
        fullPage: false
      });
      console.log('   Guardado: modal-03-full-modal.png\n');

    } else {
      console.log('❌ Modal NO se abrió\n');
    }

    console.log('✨ Prueba completada!');
    console.log('   Manteniendo navegador abierto 10 segundos...\n');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testModalOpen();
