#!/usr/bin/env node
/**
 * Captura screenshots de autorentar.com para Play Store
 * Ejecutar: node capture-screenshots.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, 'output');
const BASE_URL = 'https://autorentar.com';

// Dimensiones de screenshot para Play Store (móvil)
const VIEWPORT = {
  width: 412,
  height: 915,
  deviceScaleFactor: 2.625, // Para obtener 1080x2400 aproximadamente
  isMobile: true,
  hasTouch: true
};

// Páginas a capturar
const PAGES = [
  { name: '01-home', url: '/', description: 'Pantalla principal' },
  { name: '02-cars-map', url: '/cars/map', description: 'Mapa con autos' },
  { name: '03-cars-list', url: '/cars/list', description: 'Lista de autos' },
  { name: '04-profile', url: '/profile', description: 'Perfil de usuario' },
  { name: '05-reservations', url: '/reservations', description: 'Mis reservas' },
];

async function captureScreenshots() {
  console.log('🚀 Iniciando captura de screenshots...\n');

  // Crear directorio de salida
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // Simular User-Agent de móvil
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36');

  for (const pageConfig of PAGES) {
    const url = `${BASE_URL}${pageConfig.url}`;
    console.log(`📸 Capturando: ${pageConfig.description}`);
    console.log(`   URL: ${url}`);

    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Esperar un poco para que se cargue todo
      await page.waitForTimeout(2000);

      // Cerrar cualquier modal/banner si existe
      try {
        await page.click('[aria-label="Close"]', { timeout: 1000 });
      } catch (e) {
        // No hay modal, continuar
      }

      // Capturar screenshot
      const filename = `${pageConfig.name}.png`;
      await page.screenshot({
        path: path.join(OUTPUT_DIR, filename),
        type: 'png',
        fullPage: false
      });

      console.log(`   ✅ Guardado: ${filename}\n`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }

  // Capturar Feature Graphic desde el HTML local
  console.log('📸 Generando Feature Graphic...');
  const featurePage = await browser.newPage();
  await featurePage.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });

  const featureGraphicPath = path.join(__dirname, 'feature-graphic.html');
  if (fs.existsSync(featureGraphicPath)) {
    await featurePage.goto(`file://${featureGraphicPath}`, { waitUntil: 'networkidle0' });

    const element = await featurePage.$('.feature-graphic');
    if (element) {
      await element.screenshot({
        path: path.join(OUTPUT_DIR, 'feature-graphic.png'),
        type: 'png'
      });
      console.log('   ✅ feature-graphic.png (1024x500)\n');
    }
  }

  await browser.close();

  // Mostrar resumen
  console.log('✨ ¡Captura completada!\n');
  console.log(`📁 Screenshots guardados en: ${OUTPUT_DIR}\n`);

  const files = fs.readdirSync(OUTPUT_DIR);
  console.log('Archivos generados:');
  files.forEach(file => {
    const stats = fs.statSync(path.join(OUTPUT_DIR, file));
    console.log(`   - ${file} (${Math.round(stats.size / 1024)}KB)`);
  });
}

captureScreenshots().catch(console.error);
