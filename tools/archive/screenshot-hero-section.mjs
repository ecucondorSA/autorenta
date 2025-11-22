#!/usr/bin/env node

import { chromium } from 'playwright';
import { resolve } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1200 });

  try {
    console.log('📸 Capturando sección hero completa...\n');
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Capturar solo la sección hero (desde el inicio hasta los stats)
    const heroSection = await page.locator('.hero-header').boundingBox();

    if (heroSection) {
      const outputPath = resolve('/tmp/marketplace-screenshots', 'hero-section-full.png');
      await page.screenshot({
        path: outputPath,
        clip: heroSection
      });
      console.log('✅ Hero section: hero-section-full.png');
      console.log(`   ${Math.round(heroSection.width)}x${Math.round(heroSection.height)}px\n`);
    }

    // Capturar solo la stats bar con contexto
    const statsBar = await page.locator('div.flex.items-center.justify-center.gap-4.md\\:gap-8.mb-8.flex-wrap').boundingBox();

    if (statsBar) {
      const outputPath = resolve('/tmp/marketplace-screenshots', 'stats-bar-full-context.png');
      await page.screenshot({
        path: outputPath,
        clip: {
          x: Math.max(0, statsBar.x - 50),
          y: Math.max(0, statsBar.y - 100),
          width: statsBar.width + 100,
          height: statsBar.height + 100
        }
      });
      console.log('✅ Stats bar con contexto: stats-bar-full-context.png');
      console.log(`   Ubicación: x=${Math.round(statsBar.x)}, y=${Math.round(statsBar.y)}`);
      console.log(`   Dimensiones: ${Math.round(statsBar.width)}x${Math.round(statsBar.height)}px\n`);
    }

    console.log('🎉 Capturas guardadas en /tmp/marketplace-screenshots/');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

capture();
