#!/usr/bin/env node

import { chromium } from 'playwright';
import { resolve } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log('🎯 Capturando stats bar con imagen ampliada...\n');

    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Obtener todos los elementos de stat items
    const statItems = await page.locator('div.flex.items-center.gap-2.bg-white\\/10.backdrop-blur-md.px-4.py-2').all();
    console.log(`📊 Encontrados ${statItems.length} items en la stats bar\n`);

    // Capturar cada uno
    for (let i = 0; i < statItems.length; i++) {
      const box = await statItems[i].boundingBox();
      if (box) {
        const filename = i === 0 ? 'stat-item-cars-enlarged.png' : `stat-item-${i}.png`;
        const outputPath = resolve('/tmp/marketplace-screenshots', filename);

        await page.screenshot({
          path: outputPath,
          clip: {
            x: Math.max(0, box.x - 5),
            y: Math.max(0, box.y - 5),
            width: box.width + 10,
            height: box.height + 10
          }
        });

        const text = await statItems[i].textContent();
        console.log(`✅ ${filename}`);
        console.log(`   Tamaño: ${Math.round(box.width)}x${Math.round(box.height)}px`);
        console.log(`   Contenido: ${text?.trim()}\n`);
      }
    }

    console.log('🎉 Screenshots guardados en /tmp/marketplace-screenshots/');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

capture();
