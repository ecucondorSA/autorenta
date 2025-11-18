#!/usr/bin/env node

import { chromium } from 'playwright';
import { resolve } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

async function testCalendarClick() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log('🔍 Probando interacción con el calendario...\n');

    // Navegar
    await page.goto(`${BASE_URL}/marketplace`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Ocultar modales
    await page.evaluate(() => {
      const modals = document.querySelectorAll('app-price-transparency-modal, [class*="fixed"][class*="inset"]');
      modals.forEach(modal => {
        modal.style.display = 'none';
      });
    });

    console.log('📸 ANTES del click...');
    await page.screenshot({ path: resolve('/tmp/marketplace-screenshots', '01-before-click.png') });
    console.log('   Guardado: 01-before-click.png\n');

    // Buscar el calendario
    const calendar = await page.$('app-date-range-picker');
    if (!calendar) {
      console.log('❌ No se encontró app-date-range-picker');
      return;
    }
    console.log('✅ Calendario encontrado en el DOM\n');

    // Buscar inputs dentro del calendario
    console.log('🔍 Buscando elementos interactivos...');
    const inputs = await page.$$('app-date-range-picker input[type="date"]');
    console.log(`   Inputs tipo date: ${inputs.length}`);

    const allInputs = await page.$$('app-date-range-picker input');
    console.log(`   Todos los inputs: ${allInputs.length}`);

    const buttons = await page.$$('app-date-range-picker button');
    console.log(`   Botones: ${buttons.length}\n`);

    // Intentar hacer click en el primer input
    if (allInputs.length > 0) {
      console.log('👆 Haciendo click en el primer input...');
      await allInputs[0].scrollIntoViewIfNeeded();
      await allInputs[0].click();
      await page.waitForTimeout(1000);

      console.log('📸 DESPUÉS del click en input...');
      await page.screenshot({ path: resolve('/tmp/marketplace-screenshots', '02-after-input-click.png') });
      console.log('   Guardado: 02-after-input-click.png\n');
    }

    // Intentar hacer click en un botón de preset
    if (buttons.length > 0) {
      console.log('👆 Haciendo click en el primer botón...');
      await buttons[0].scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await buttons[0].click();
      await page.waitForTimeout(1000);

      console.log('📸 DESPUÉS del click en botón...');
      await page.screenshot({ path: resolve('/tmp/marketplace-screenshots', '03-after-button-click.png') });
      console.log('   Guardado: 03-after-button-click.png\n');
    }

    // Buscar si se abrió algún modal o picker
    console.log('🔍 Buscando elementos expandidos...');
    const modalsOpen = await page.$$('[class*="modal"][class*="open"], [class*="picker"][class*="show"]');
    console.log(`   Modales/pickers abiertos: ${modalsOpen.length}\n`);

    // Captura final
    console.log('📸 Captura FINAL...');
    await page.screenshot({
      path: resolve('/tmp/marketplace-screenshots', '04-final-state.png'),
      fullPage: false
    });
    console.log('   Guardado: 04-final-state.png\n');

    console.log('✨ Prueba completada! Revisa /tmp/marketplace-screenshots/');
    console.log('   Navegador quedará abierto 5 segundos para inspección...\n');

    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testCalendarClick();
