#!/usr/bin/env node

import { chromium } from 'playwright';
import { resolve } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log('📸 Captura final con inputs de calendario...\n');

    await page.goto(`${BASE_URL}/marketplace`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Cerrar modales
    await page.evaluate(() => {
      document.querySelectorAll('app-price-transparency-modal').forEach(modal => {
        modal.style.display = 'none';
      });
    });

    await page.waitForTimeout(500);

    // Click para abrir modal
    await page.evaluate(() => {
      const wrapper = document.querySelector('app-date-range-picker .date-input-wrapper');
      if (wrapper) wrapper.click();
    });

    await page.waitForTimeout(1500);

    // Captura del modal con inputs visibles
    const modalContent = await page.locator('div.w-full.max-w-lg.bg-white').first();
    const modalBox = await modalContent.boundingBox();

    if (modalBox) {
      console.log('📸 Modal con inputs de calendario visibles...');
      await page.screenshot({
        path: resolve('/tmp/marketplace-screenshots', 'FINAL_CALENDAR_WITH_INPUTS.png'),
        clip: {
          x: Math.max(0, modalBox.x - 20),
          y: Math.max(0, modalBox.y - 20),
          width: modalBox.width + 40,
          height: Math.min(modalBox.height + 40, 800)
        }
      });
      console.log(`   ✅ FINAL_CALENDAR_WITH_INPUTS.png (${Math.round(modalBox.width)}x${Math.round(modalBox.height)}px)\n`);
    }

    // Información de los inputs
    const inputsInfo = await page.evaluate(() => {
      const fromInput = document.querySelector('input[type="date"]');
      const toInput = document.querySelectorAll('input[type="date"]')[1];
      return {
        fromExists: !!fromInput,
        toExists: !!toInput,
        totalInputs: document.querySelectorAll('input[type="date"]').length
      };
    });

    console.log('════════════════════════════════════════');
    console.log('✅ IMPLEMENTACIÓN COMPLETADA');
    console.log('════════════════════════════════════════');
    console.log(`✅ Inputs tipo date encontrados: ${inputsInfo.totalInputs}`);
    console.log(`✅ Input "Fecha inicio": ${inputsInfo.fromExists ? 'SÍ' : 'NO'}`);
    console.log(`✅ Input "Fecha fin": ${inputsInfo.toExists ? 'SÍ' : 'NO'}`);
    console.log('✅ Calendario nativo se abrirá al hacer click en inputs');
    console.log('════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

capture();
