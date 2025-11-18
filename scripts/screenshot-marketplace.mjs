#!/usr/bin/env node

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';
const OUTPUT_DIR = '/tmp/marketplace-screenshots';

async function captureScreenshot() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log(`📸 Capturing marketplace page from ${BASE_URL}...`);

    // Navigate to the marketplace
    await page.goto(`${BASE_URL}/marketplace`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for images to load
    await page.waitForTimeout(2000);

    // Capture full page screenshot
    const fullPagePath = resolve(OUTPUT_DIR, 'marketplace-full.png');
    await page.screenshot({ path: fullPagePath, fullPage: true });
    console.log(`✅ Full page screenshot: ${fullPagePath}`);

    // Capture hero section specifically
    const heroSelector = '.hero-header';
    const heroElement = await page.$(heroSelector);

    if (heroElement) {
      const heroBoundingBox = await heroElement.boundingBox();
      if (heroBoundingBox) {
        const heroPath = resolve(OUTPUT_DIR, 'marketplace-hero.png');
        await page.screenshot({
          path: heroPath,
          clip: heroBoundingBox
        });
        console.log(`✅ Hero section screenshot: ${heroPath}`);
      }
    }

    // Capture the stats bar with the MB image
    const statsBarSelector = '.flex.items-center.justify-center.gap-4.md\\:gap-8.mb-8.flex-wrap';
    const statsElements = await page.$$('.flex.items-center.justify-center.gap-4');

    if (statsElements.length > 0) {
      for (let i = 0; i < statsElements.length; i++) {
        const bbox = await statsElements[i].boundingBox();
        if (bbox && bbox.y < 500) { // Only hero stats bars
          const statsPath = resolve(OUTPUT_DIR, `marketplace-stats-bar-${i}.png`);
          await page.screenshot({
            path: statsPath,
            clip: bbox
          });
          console.log(`✅ Stats bar ${i} screenshot: ${statsPath}`);
        }
      }
    }

    console.log('\n🎉 All screenshots captured successfully!');
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);

  } catch (error) {
    console.error('❌ Error capturing screenshot:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

captureScreenshot();
