#!/usr/bin/env node

import { chromium } from 'playwright';
import { resolve } from 'path';
import { mkdirSync } from 'fs';

const BASE_URL = 'http://localhost:4200';

async function capture() {
  const outputDir = '/tmp/autorenta-screenshots';
  mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1200 });

  try {
    console.log('📸 Capturando localhost:4200...\n');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const outputPath = resolve(outputDir, 'localhost-4200-full.png');
    await page.screenshot({
      path: outputPath,
      fullPage: true
    });

    console.log('✅ Screenshot guardado:');
    console.log(`   ${outputPath}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

capture();
