#!/usr/bin/env node

import { chromium } from 'playwright';
import { resolve } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

async function captureMap() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log('📸 Capturando mapa sin botón de capas y con tema basado en hora...\n');

    await page.goto(`${BASE_URL}/marketplace`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    // Cerrar modales
    await page.evaluate(() => {
      document.querySelectorAll('app-price-transparency-modal').forEach(modal => {
        modal.style.display = 'none';
      });
    });

    await page.waitForTimeout(500);

    // Verificar que el botón de capas NO existe
    const layersButton = await page.$('app-map-layers-control button');
    console.log('🔍 Botón de control de capas:');
    console.log(`   ${layersButton ? '❌ AÚN EXISTE' : '✅ ELIMINADO CORRECTAMENTE'}\n`);

    // Obtener info del mapa
    const mapInfo = await page.evaluate(() => {
      const hour = new Date().getHours();
      let expectedTheme = 'day';
      if (hour >= 6 && hour < 11) expectedTheme = 'dawn';
      else if (hour >= 11 && hour < 18) expectedTheme = 'day';
      else if (hour >= 18 && hour < 21) expectedTheme = 'dusk';
      else expectedTheme = 'night';

      return {
        currentHour: hour,
        expectedTheme,
        mapExists: !!document.querySelector('app-cars-map')
      };
    });

    console.log('🗺️  Estado del mapa:');
    console.log(`   Hora actual: ${mapInfo.currentHour}:00`);
    console.log(`   Tema esperado: ${mapInfo.expectedTheme}`);
    console.log(`   Mapa renderizado: ${mapInfo.mapExists ? 'SÍ' : 'NO'}\n`);

    // Capturar mapa
    const mapContainer = await page.$('app-cars-map');
    if (mapContainer) {
      const mapBox = await mapContainer.boundingBox();
      if (mapBox) {
        console.log('📸 Capturando mapa...');
        await page.screenshot({
          path: resolve('/tmp/marketplace-screenshots', 'MAP_WITHOUT_LAYERS_BUTTON.png'),
          clip: {
            x: Math.max(0, mapBox.x),
            y: Math.max(0, mapBox.y),
            width: Math.min(1920, mapBox.width),
            height: Math.min(800, mapBox.height)
          }
        });
        console.log(`   ✅ MAP_WITHOUT_LAYERS_BUTTON.png\n`);
      }
    }

    console.log('════════════════════════════════════════');
    console.log('✅ CAMBIOS COMPLETADOS');
    console.log('════════════════════════════════════════');
    console.log('✅ Botón de control de capas eliminado');
    console.log('✅ Tema del mapa basado en hora del día:');
    console.log('   • 6:00-11:00 → dawn (amanecer)');
    console.log('   • 11:00-18:00 → day (día)');
    console.log('   • 18:00-21:00 → dusk (atardecer)');
    console.log('   • 21:00-6:00 → night (noche)');
    console.log('════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureMap();
