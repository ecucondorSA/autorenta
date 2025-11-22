#!/usr/bin/env node

import { chromium } from 'playwright';
import { resolve } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

async function testModalOpen() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log('🔍 Probando apertura de modal de calendario...\n');

    await page.goto(`${BASE_URL}/marketplace`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Cerrar modal de precio con JavaScript
    console.log('🚫 Cerrando modales bloqueantes...');
    await page.evaluate(() => {
      const modals = document.querySelectorAll('app-price-transparency-modal');
      modals.forEach(modal => {
        modal.style.display = 'none';
      });
    });

    await page.waitForTimeout(500);

    console.log('📸 Estado INICIAL (sin modales)...');
    await page.screenshot({ path: resolve('/tmp/marketplace-screenshots', 'MODAL-01-before.png') });
    console.log('   Guardado: MODAL-01-before.png\n');

    // Buscar el área clicable del calendario
    console.log('🎯 Buscando y haciendo click en el calendario...');
    const clicked = await page.evaluate(() => {
      const wrapper = document.querySelector('app-date-range-picker .date-input-wrapper');
      if (wrapper) {
        wrapper.click();
        return true;
      }
      return false;
    });

    if (clicked) {
      console.log('✅ Click ejecutado en .date-input-wrapper\n');
    } else {
      console.log('❌ No encontró .date-input-wrapper\n');
      return;
    }

    await page.waitForTimeout(1500);

    console.log('📸 DESPUÉS del click...');
    await page.screenshot({ path: resolve('/tmp/marketplace-screenshots', 'MODAL-02-after-click.png') });
    console.log('   Guardado: MODAL-02-after-click.png\n');

    // Verificar si se abrió el modal
    console.log('🔍 Verificando si se abrió el modal...');
    const modalInfo = await page.evaluate(() => {
      const modal = document.querySelector('div[class*="fixed"].z-50');
      const calendarInModal = modal ? modal.querySelector('app-date-range-picker') : null;

      return {
        modalExists: !!modal,
        modalVisible: modal ? window.getComputedStyle(modal).display !== 'none' : false,
        hasCalendar: !!calendarInModal,
        modalHTML: modal ? modal.innerHTML.substring(0, 200) : null
      };
    });

    if (modalInfo.modalExists) {
      console.log('✅ Modal ENCONTRADO en el DOM');
      console.log(`   Visible: ${modalInfo.modalVisible ? 'SÍ' : 'NO'}`);
      console.log(`   Tiene calendario: ${modalInfo.hasCalendar ? 'SÍ' : 'NO'}\n`);

      console.log('📸 Modal completo...');
      await page.screenshot({
        path: resolve('/tmp/marketplace-screenshots', 'MODAL-03-full-modal.png'),
        fullPage: false
      });
      console.log('   Guardado: MODAL-03-full-modal.png\n');

    } else {
      console.log('❌ Modal NO se abrió\n');

      // Debug: verificar el método handleDateInputClick
      console.log('🔍 DEBUG: Verificando método handleDateInputClick...');
      const debugInfo = await page.evaluate(() => {
        const pickerElements = Array.from(document.querySelectorAll('app-date-range-picker'));
        return {
          pickersCount: pickerElements.length,
          pickerClasses: pickerElements.map(p => p.className)
        };
      });
      console.log(`   Calendarios encontrados: ${debugInfo.pickersCount}`);
      console.log(`   Clases: ${JSON.stringify(debugInfo.pickerClasses)}\n`);
    }

    console.log('✨ Prueba completada!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testModalOpen();
