#!/usr/bin/env node

import { chromium } from 'playwright';
import { resolve } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';
const OUTPUT_DIR = '/tmp/marketplace-screenshots';

async function captureStatsBar() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set viewport to ensure consistent rendering
  await page.setViewportSize({ width: 1280, height: 720 });

  try {
    console.log(`📸 Capturing stats bar with enlarged image...`);

    // Navigate to marketplace
    await page.goto(`${BASE_URL}/marketplace`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for images to load
    await page.waitForTimeout(2000);

    // Find the stats bar with the MB.png image
    const selector = 'div.flex.items-center.justify-center.gap-4.md\\:gap-8.mb-8.flex-wrap';
    const statsBarElements = await page.locator(selector).all();

    console.log(`Found ${statsBarElements.length} stats bar elements`);

    if (statsBarElements.length > 0) {
      // Get the first one (in hero section)
      const bbox = await statsBarElements[0].boundingBox();

      if (bbox) {
        console.log(`Stats bar location: x=${bbox.x}, y=${bbox.y}, w=${bbox.width}, h=${bbox.height}`);

        const statsPath = resolve(OUTPUT_DIR, 'marketplace-stats-bar-enlarged.png');
        await page.screenshot({
          path: statsPath,
          clip: {
            x: Math.max(0, bbox.x - 20),
            y: Math.max(0, bbox.y - 20),
            width: bbox.width + 40,
            height: bbox.height + 40
          }
        });
        console.log(`✅ Stats bar screenshot saved: ${statsPath}`);
      }
    }

    // Also capture the individual stat items
    const statItems = await page.locator('div.flex.items-center.gap-2.bg-white\\/10.backdrop-blur-md').all();
    console.log(`Found ${statItems.length} individual stat items`);

    if (statItems.length > 0) {
      const firstItemBox = await statItems[0].boundingBox();
      if (firstItemBox) {
        const itemPath = resolve(OUTPUT_DIR, 'marketplace-stat-item-cars.png');
        await page.screenshot({
          path: itemPath,
          clip: {
            x: Math.max(0, firstItemBox.x - 10),
            y: Math.max(0, firstItemBox.y - 10),
            width: firstItemBox.width + 20,
            height: firstItemBox.height + 20
          }
        });
        console.log(`✅ Individual stat item screenshot: ${itemPath}`);
      }
    }

    console.log('\n🎉 Screenshots captured successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

captureStatsBar();
