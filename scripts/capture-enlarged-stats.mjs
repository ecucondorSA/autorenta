#!/usr/bin/env node

import { chromium } from 'playwright';
import { resolve } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';
const OUTPUT_DIR = '/tmp/marketplace-screenshots';

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  try {
    console.log('📸 Navigating to marketplace...');
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Esperar a la imagen MB.png
    console.log('⏳ Waiting for MB.png image...');
    await page.waitForSelector('img[src*="MB.png"]', { timeout: 5000 });

    // Obtener info de la imagen
    const imgSelector = 'img[src*="MB.png"]';
    const imgBox = await page.locator(imgSelector).boundingBox();

    if (imgBox) {
      console.log(`✅ MB.png found at: x=${imgBox.x}, y=${imgBox.y}, w=${imgBox.width}px, h=${imgBox.height}px`);

      // Capturar toda la stats bar
      const statsContainer = await page.locator('div.flex.items-center.justify-center.gap-4.md\\:gap-8.mb-8.flex-wrap').boundingBox();

      if (statsContainer) {
        const outputPath = resolve(OUTPUT_DIR, 'stats-bar-enlarged-image.png');
        await page.screenshot({
          path: outputPath,
          clip: statsContainer
        });
        console.log(`✅ Stats bar saved: ${outputPath}`);
        console.log(`   Dimensions: ${statsContainer.width}x${statsContainer.height}px`);
      }
    } else {
      console.log('⚠️  MB.png image not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

capture();
