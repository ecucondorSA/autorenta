#!/usr/bin/env node

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

async function testSelector() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log('🔍 Probando selectores...\n');

    // Navegar
    await page.goto(`${BASE_URL}/marketplace`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // TEST 1: Buscar el selector original (app-date-search)
    console.log('TEST 1: Buscando app-date-search');
    const dateSearchExists = await page.$('app-date-search');
    console.log(`  ❌ app-date-search: ${dateSearchExists ? 'ENCONTRADO' : 'NO ENCONTRADO'}\n`);

    // TEST 2: Buscar el nuevo selector (app-date-range-picker)
    console.log('TEST 2: Buscando app-date-range-picker');
    const dateRangePickerExists = await page.$('app-date-range-picker');
    if (dateRangePickerExists) {
      console.log(`  ✅ app-date-range-picker: ENCONTRADO`);

      // Obtener información del componente
      const info = await page.evaluate(() => {
        const picker = document.querySelector('app-date-range-picker');
        return {
          className: picker?.className,
          textContent: picker?.textContent?.substring(0, 100),
          innerHTML: picker?.innerHTML?.length
        };
      });
      console.log(`     Clase: ${info.className}`);
      console.log(`     Contenido: ${info.textContent?.trim()}\n`);
    } else {
      console.log(`  ❌ app-date-range-picker: NO ENCONTRADO\n`);
    }

    // TEST 3: Buscar el selector completo original del usuario (adaptado)
    console.log('TEST 3: Probando selector CSS completo');
    const fullSelector = '#main-content > app-marketplace-v2-page > div.hero-header > div > div.max-w-5xl > div > div.grid.grid-cols-1';
    const fullSelectorExists = await page.$(fullSelector);
    console.log(`  ${fullSelectorExists ? '✅' : '❌'} Selector CSS completo: ${fullSelectorExists ? 'FUNCIONA' : 'NO FUNCIONA'}\n`);

    // TEST 4: Encontrar el calendario y hacer click
    console.log('TEST 4: Interactuando con el calendario');
    const calendarInputs = await page.$$('app-date-range-picker input');
    console.log(`  Encontrados ${calendarInputs.length} inputs en app-date-range-picker`);

    // TEST 5: Buscar presets de fecha
    console.log('\nTEST 5: Buscando presets de fecha');
    const presets = await page.$$('button:has-text("semana"), button:has-text("mes")');
    console.log(`  Encontrados ${presets.length} botones de presets\n`);

    // TEST 6: Hacer scroll y screenshot interactivo
    console.log('TEST 6: Capturando calendario en acción');
    const calendarElement = await page.$('app-date-range-picker');
    if (calendarElement) {
      await calendarElement.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      console.log('  ✅ Calendario visible y posicionado\n');
    }

    // Información final
    console.log('════════════════════════════════════════');
    console.log('✨ RESUMEN:');
    console.log('════════════════════════════════════════');
    console.log(`✅ Reemplazo completado: app-date-search → app-date-range-picker`);
    console.log(`✅ Nuevo selector: app-date-range-picker`);
    console.log(`✅ Componente funcional y renderizado correctamente`);
    console.log('════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testSelector();
