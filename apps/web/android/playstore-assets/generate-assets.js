#!/usr/bin/env node
/**
 * Script para generar assets de Play Store automáticamente
 * Usa Puppeteer para capturar los elementos HTML como imágenes
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ASSETS_DIR = __dirname;
const OUTPUT_DIR = path.join(ASSETS_DIR, 'output');

// Crear directorio de salida
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generateAssets() {
  console.log('🚀 Iniciando generación de assets para Play Store...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // 1. Generar Feature Graphic (1024x500)
    console.log('📸 Generando Feature Graphic (1024x500)...');
    const page1 = await browser.newPage();
    await page1.setViewport({ width: 1200, height: 600 });
    await page1.goto(`file://${path.join(ASSETS_DIR, 'feature-graphic.html')}`, {
      waitUntil: 'networkidle0'
    });

    const featureGraphic = await page1.$('.feature-graphic');
    await featureGraphic.screenshot({
      path: path.join(OUTPUT_DIR, 'feature-graphic.png'),
      type: 'png'
    });
    console.log('   ✅ feature-graphic.png (1024x500)\n');
    await page1.close();

    // 2. Generar Screenshots template preview
    console.log('📸 Generando preview de Screenshots...');
    const page2 = await browser.newPage();
    await page2.setViewport({ width: 1200, height: 2000 });
    await page2.goto(`file://${path.join(ASSETS_DIR, 'screenshot-template.html')}`, {
      waitUntil: 'networkidle0'
    });

    await page2.screenshot({
      path: path.join(OUTPUT_DIR, 'screenshots-preview.png'),
      type: 'png',
      fullPage: true
    });
    console.log('   ✅ screenshots-preview.png\n');

    // 3. Generar cada screenshot individual (270x480 preview, escalar a 1080x1920)
    const screenshots = await page2.$$('.screenshot');
    for (let i = 0; i < screenshots.length; i++) {
      const screenshot = screenshots[i];
      await screenshot.screenshot({
        path: path.join(OUTPUT_DIR, `screenshot-${i + 1}-preview.png`),
        type: 'png'
      });
      console.log(`   ✅ screenshot-${i + 1}-preview.png`);
    }
    await page2.close();

    console.log('\n✨ ¡Assets generados exitosamente!');
    console.log(`📁 Ubicación: ${OUTPUT_DIR}`);
    console.log('\n📋 Archivos generados:');
    const files = fs.readdirSync(OUTPUT_DIR);
    files.forEach(file => {
      const stats = fs.statSync(path.join(OUTPUT_DIR, file));
      console.log(`   - ${file} (${Math.round(stats.size / 1024)}KB)`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

generateAssets();
