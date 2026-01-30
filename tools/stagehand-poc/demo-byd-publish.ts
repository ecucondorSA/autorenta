/**
 * Demo Recording - Publicar BYD Nano Banana Pro
 *
 * Graba el flujo completo de publicación de un BYD con 3 fotos reales
 * generadas por Gemini AI.
 *
 * Ejecutar:
 *   cd tools/stagehand-poc && bun demo-byd-publish.ts
 */

import { Stagehand } from '@browserbasehq/stagehand';
import * as fs from 'fs';
import * as path from 'path';

// ============ CONFIGURACIÓN ============
const CONFIG = {
  baseUrl: 'https://autorentar.com',
  testUser: {
    email: process.env.TEST_USER_EMAIL || '',
    password: process.env.TEST_USER_PASSWORD || '',
  },
  bydCar: {
    brand: 'BYD',
    year: '2024',
    model: 'Dolphin',  // Usando modelo real de FIPE
    mileage: '5000',
    pricePerDay: '45',
    location: 'Buenos Aires',
    description: 'BYD Nano Banana Pro - 100% eléctrico, perfecto para la ciudad',
  },
  // Las 3 imágenes generadas con Gemini
  images: [
    '/home/edu/Downloads/Gemini_Generated_Image_5d01ki5d01ki5d01 (1).png',
    '/home/edu/Downloads/Gemini_Generated_Image_5d01ki5d01ki5d01 (2).png',
    '/home/edu/Downloads/Gemini_Generated_Image_5d01ki5d01ki5d01 (3).png',
  ],
  outputDir: '/home/edu/autorenta/marketing/demos',
  screenshotDir: '/home/edu/autorenta/tools/stagehand-poc/screenshots/byd-demo',
};

// Validar configuración
function validateConfig() {
  // Verificar imágenes
  for (const img of CONFIG.images) {
    if (!fs.existsSync(img)) {
      console.error(`❌ Imagen no encontrada: ${img}`);
      process.exit(1);
    }
  }
  console.log('✅ 3 imágenes BYD verificadas');

  // Crear directorios
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  if (!fs.existsSync(CONFIG.screenshotDir)) {
    fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
  }

  // Verificar credenciales (opcional para demo)
  if (!CONFIG.testUser.email) {
    console.warn('⚠️  Sin credenciales de test - necesitarás login manual');
  }
}

// Limpiar screenshots anteriores
function cleanScreenshots() {
  const files = fs.readdirSync(CONFIG.screenshotDir);
  for (const file of files) {
    if (file.endsWith('.png')) {
      fs.unlinkSync(path.join(CONFIG.screenshotDir, file));
    }
  }
  console.log('🧹 Screenshots anteriores limpiados');
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🎬 DEMO: Publicar BYD Nano Banana Pro en AutoRenta');
  console.log('═'.repeat(60));
  console.log(`\n📍 URL: ${CONFIG.baseUrl}`);
  console.log(`🚙 Auto: ${CONFIG.bydCar.brand} ${CONFIG.bydCar.model} ${CONFIG.bydCar.year}`);
  console.log(`📸 Imágenes: ${CONFIG.images.length} fotos Gemini AI\n`);

  validateConfig();
  cleanScreenshots();

  const stagehand = new Stagehand({
    env: 'LOCAL',
    model: 'google/gemini-2.5-flash',
    headless: false,  // Mostrar browser para demo
    verbose: 1,
  });

  let screenshotIndex = 0;
  const screenshots: string[] = [];

  try {
    await stagehand.init();
    const page = stagehand.context.pages()[0];

    // Configurar viewport mobile
    await page.setViewportSize({ width: 375, height: 812 });

    // Helper para screenshots
    const screenshot = async (name: string) => {
      const filename = `${String(screenshotIndex++).padStart(2, '0')}-${name}.png`;
      const filepath = path.join(CONFIG.screenshotDir, filename);
      await page.screenshot({ path: filepath });
      screenshots.push(filepath);
      console.log(`   📸 ${filename}`);
    };

    // ========== PASO 1: NAVEGAR A PUBLICAR ==========
    console.log('\n🔄 Paso 1: Navegando a publicar auto...');
    await page.goto(`${CONFIG.baseUrl}/cars/publish`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);  // Esperar Angular render
    await screenshot('home-publish');

    // ========== PASO 2: SELECCIONAR BYD ==========
    console.log('\n🔄 Paso 2: Seleccionando marca BYD...');

    // Buscar BYD en el campo de búsqueda
    await stagehand.act('type "BYD" in the brand search input field');
    await page.waitForTimeout(1500);
    await screenshot('search-byd');

    // Click en BYD de la lista
    await stagehand.act('click on "BYD" in the brand list or grid');
    await page.waitForTimeout(1000);
    await screenshot('byd-selected');

    // Continuar
    await stagehand.act('click the "Continuar" button');
    await page.waitForTimeout(2000);
    await screenshot('after-brand');

    // ========== PASO 3: SELECCIONAR AÑO ==========
    console.log('\n🔄 Paso 3: Seleccionando año 2024...');
    await stagehand.act(`click on "${CONFIG.bydCar.year}" year button or option`);
    await page.waitForTimeout(1000);
    await screenshot('year-selected');

    await stagehand.act('click the "Continuar" button');
    await page.waitForTimeout(2000);
    await screenshot('after-year');

    // ========== PASO 4: SELECCIONAR MODELO ==========
    console.log('\n🔄 Paso 4: Seleccionando modelo Dolphin...');
    await stagehand.act(`type "${CONFIG.bydCar.model}" in the model search field`);
    await page.waitForTimeout(1500);
    await screenshot('search-model');

    await stagehand.act(`click on "${CONFIG.bydCar.model}" in the model list`);
    await page.waitForTimeout(1000);
    await screenshot('model-selected');

    await stagehand.act('click the "Continuar" button');
    await page.waitForTimeout(2000);
    await screenshot('after-model');

    // ========== PASO 5: SUBIR FOTOS ==========
    console.log('\n🔄 Paso 5: Subiendo 3 fotos del BYD...');
    await screenshot('photos-step');

    // Buscar el input de archivos y subir las imágenes
    const fileInput = await page.locator('input[type="file"]').first();
    if (fileInput) {
      await fileInput.setInputFiles(CONFIG.images);
      console.log('   ✅ 3 imágenes subidas');
      await page.waitForTimeout(5000);  // Esperar upload
      await screenshot('photos-uploaded');
    } else {
      console.log('   ⚠️  No se encontró input de archivos, intentando con IA...');
      await stagehand.act('click on the photo upload area or "Subir fotos" button');
      await page.waitForTimeout(2000);
    }

    await stagehand.act('click the "Continuar" button');
    await page.waitForTimeout(2000);
    await screenshot('after-photos');

    // ========== PASO 6: KILOMETRAJE ==========
    console.log('\n🔄 Paso 6: Ingresando kilometraje...');
    await stagehand.act(`type "${CONFIG.bydCar.mileage}" in the mileage input field`);
    await page.waitForTimeout(1000);
    await screenshot('mileage-entered');

    await stagehand.act('click the "Continuar" button');
    await page.waitForTimeout(2000);
    await screenshot('after-mileage');

    // ========== PASO 7: PRECIO ==========
    console.log('\n🔄 Paso 7: Estableciendo precio...');
    await stagehand.act(`type "${CONFIG.bydCar.pricePerDay}" in the price per day input`);
    await page.waitForTimeout(1000);
    await screenshot('price-entered');

    await stagehand.act('click the "Continuar" button');
    await page.waitForTimeout(2000);
    await screenshot('after-price');

    // ========== PASO 8: UBICACIÓN ==========
    console.log('\n🔄 Paso 8: Seleccionando ubicación...');
    await stagehand.act(`type "${CONFIG.bydCar.location}" in the location search field`);
    await page.waitForTimeout(2000);
    await screenshot('location-search');

    await stagehand.act('click on the first location suggestion');
    await page.waitForTimeout(1000);
    await screenshot('location-selected');

    await stagehand.act('click the "Continuar" button');
    await page.waitForTimeout(2000);
    await screenshot('after-location');

    // ========== PASO 9: RESUMEN ==========
    console.log('\n🔄 Paso 9: Verificando resumen...');
    await screenshot('summary');

    // NO publicar realmente (es demo)
    console.log('   ⚠️  Demo mode - NO se publica realmente');

    // ========== GENERAR GIF ==========
    console.log('\n🎬 Generando GIF del demo...');

    const gifPath = path.join(CONFIG.outputDir, 'byd-publication-demo.gif');

    // Usar ffmpeg para crear GIF desde screenshots
    const { execSync } = await import('child_process');
    try {
      // Crear GIF con ffmpeg
      const cmd = `ffmpeg -y -framerate 1 -pattern_type glob -i '${CONFIG.screenshotDir}/*.png' -vf "scale=375:-1,fps=1" -loop 0 "${gifPath}"`;
      execSync(cmd, { stdio: 'inherit' });
      console.log(`\n✅ GIF generado: ${gifPath}`);
    } catch (e) {
      console.log('   ⚠️  ffmpeg no disponible, guardando screenshots individuales');
      console.log(`   📁 Screenshots en: ${CONFIG.screenshotDir}`);
    }

    // ========== RESUMEN ==========
    console.log('\n' + '═'.repeat(60));
    console.log('📊 DEMO COMPLETADO');
    console.log('═'.repeat(60));
    console.log(`\n📸 Screenshots: ${screenshots.length} capturas`);
    console.log(`📁 Ubicación: ${CONFIG.screenshotDir}`);
    console.log(`🎬 GIF: ${gifPath}`);

  } catch (error) {
    console.error('\n💥 Error en demo:', error);
  } finally {
    console.log('\n🔚 Cerrando navegador...');
    await stagehand.close();
  }
}

main().catch(console.error);
