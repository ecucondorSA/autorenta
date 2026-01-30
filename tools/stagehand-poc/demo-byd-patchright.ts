/**
 * Demo BYD - Usando Patchright (Playwright sin detección)
 *
 * Ejecutar: cd tools/stagehand-poc && bun demo-byd-patchright.ts
 */

import { chromium } from 'patchright';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG = {
  baseUrl: 'https://autorentar.com',
  credentials: {
    email: 'eduardomarques@campus.fmed.uba.ar',
    password: 'Ab.12345',
  },
  byd: {
    brand: 'BYD',
    year: '2024',
    model: 'Dolphin EV',  // Nombre en FIPE: "Dolphin EV (Elétrico)"
    mileage: '5000',
    price: '45',
  },
  images: [
    '/home/edu/Downloads/Gemini_Generated_Image_5d01ki5d01ki5d01 (1).png',
    '/home/edu/Downloads/Gemini_Generated_Image_5d01ki5d01ki5d01 (2).png',
    '/home/edu/Downloads/Gemini_Generated_Image_5d01ki5d01ki5d01 (3).png',
  ],
  screenshotDir: '/home/edu/autorenta/tools/stagehand-poc/screenshots/byd-demo',
  outputDir: '/home/edu/autorenta/marketing/demos',
};

// Crear directorios
fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
fs.mkdirSync(CONFIG.outputDir, { recursive: true });

// Limpiar screenshots anteriores
for (const file of fs.readdirSync(CONFIG.screenshotDir)) {
  if (file.endsWith('.png')) fs.unlinkSync(path.join(CONFIG.screenshotDir, file));
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== MOVIMIENTOS HUMANOS ==========

// Delay aleatorio entre min y max
function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Espera humana (variable)
async function humanWait(baseMs: number = 1000) {
  const variation = randomDelay(-300, 500);
  await sleep(Math.max(500, baseMs + variation));
}

// Typing humano (caracter por caracter con velocidad variable)
async function humanType(page: any, selector: string, text: string) {
  const element = page.locator(selector).first();
  await element.waitFor({ state: 'visible', timeout: 10000 });
  await element.click();
  await sleep(randomDelay(200, 400));

  for (const char of text) {
    await element.type(char, { delay: randomDelay(50, 150) });
  }
  await humanWait(300);
}

// Click humano (con pequeño movimiento previo)
async function humanClick(page: any, locator: any) {
  await locator.waitFor({ state: 'visible', timeout: 10000 });

  // Pequeña pausa antes del click (como si el usuario estuviera "apuntando")
  await sleep(randomDelay(200, 500));

  // Click con pequeña variación en posición
  await locator.click({
    position: {
      x: randomDelay(5, 15),
      y: randomDelay(5, 15),
    },
  });

  await humanWait(800);
}

// Scroll humano (suave, no instantáneo)
async function humanScroll(page: any, direction: 'down' | 'up' = 'down', amount: number = 300) {
  const scrollY = direction === 'down' ? amount : -amount;

  // Scroll en pequeños pasos
  const steps = 5;
  const stepAmount = scrollY / steps;

  for (let i = 0; i < steps; i++) {
    await page.evaluate((y: number) => window.scrollBy(0, y), stepAmount);
    await sleep(randomDelay(50, 100));
  }

  await humanWait(500);
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🎬 DEMO BYD - Patchright (sin detección anti-bot)');
  console.log('═'.repeat(60));

  // Usar perfil persistente para mantener sesión (REGLA: aprovechar sesiones abiertas)
  const userDataDir = '/home/edu/.patchright-demo-byd';

  // iPhone 15 Pro Max viewport - Usar Google Chrome instalado
  // Args para evitar corte de imagen: ventana más grande que el viewport
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',  // Usar Google Chrome en lugar de Chromium
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    args: [
      '--window-size=500,1000',     // Ventana más grande que viewport
      '--window-position=100,50',   // Posición fija para evitar cortes
      '--force-device-scale-factor=1',  // Escala de ventana (no afecta al viewport)
    ],
  });

  const page = browser.pages()[0] || await browser.newPage();
  let step = 0;

  const screenshot = async (name: string) => {
    const filename = `${String(step++).padStart(2, '0')}-${name}.png`;
    // fullPage: false para capturar solo el viewport (evita scroll)
    // clip: asegura que capture exactamente el viewport sin cortes
    await page.screenshot({
      path: path.join(CONFIG.screenshotDir, filename),
      clip: { x: 0, y: 0, width: 430, height: 932 },  // Exactamente el viewport
    });
    console.log(`   📸 ${filename}`);
  };

  try {
    // ========== PASO 0: LIMPIAR ESTADO ==========
    console.log('\n🔄 Paso 0: Limpiando estado anterior...');
    // Ir a la página base primero para poder limpiar localStorage
    await page.goto(CONFIG.baseUrl, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    // Limpiar cualquier estado de publicación anterior
    await page.evaluate(() => {
      // Remover keys relacionadas con el flujo de publicación
      const keysToRemove = Object.keys(localStorage).filter(k =>
        k.includes('publish') || k.includes('car') || k.includes('draft')
      );
      keysToRemove.forEach(k => localStorage.removeItem(k));
    });
    console.log('   ✅ Estado limpiado');

    // ========== PASO 1: IR A PUBLICAR ==========
    console.log('\n🔄 Paso 1: Navegando a publicar...');
    await page.goto(`${CONFIG.baseUrl}/cars/publish`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await screenshot('publish-page');

    // Verificar si necesita login
    const url = page.url();
    if (url.includes('/auth/login') || url.includes('/auth')) {
      console.log('   → Necesita login, haciendo login...');
      await screenshot('needs-login');

      // Esperar a que Angular renderice
      await sleep(3000);

      // Paso 1: Click en botón principal "Ingresar" (verde)
      const mainIngresar = page.locator('button:has-text("Ingresar")').first();
      if (await mainIngresar.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('   → Click en Ingresar principal...');
        await mainIngresar.click();
        await sleep(2000);
        await screenshot('after-main-ingresar');
      }

      // Paso 2: Click en "o con email" para mostrar form
      const emailOption = page.locator('button:has-text("o con email"), button:has-text("con email"), a:has-text("email")').first();
      if (await emailOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('   → Click en "o con email"...');
        await emailOption.click();
        await sleep(2000);
        await screenshot('email-form-shown');
      }

      // Esperar a que aparezca el formulario
      await sleep(2000);

      // Llenar email
      console.log('   → Llenando credenciales...');
      const emailInput = page.locator('input[type="email"], input[name="email"], input[autocomplete="email"]').first();
      await emailInput.waitFor({ state: 'visible', timeout: 10000 });
      await emailInput.fill(CONFIG.credentials.email);
      await sleep(500);

      // Llenar password
      const passInput = page.locator('input[type="password"]').first();
      await passInput.waitFor({ state: 'visible', timeout: 5000 });
      await passInput.fill(CONFIG.credentials.password);
      await sleep(500);
      await screenshot('credentials-filled');

      // Submit - buscar el botón de submit del form
      const submitBtn = page.locator('button[type="submit"]:has-text("Ingresar"), form button:has-text("Ingresar")').first();
      console.log('   → Enviando login...');
      await submitBtn.click();
      await sleep(5000);
      await screenshot('post-login');

      // Volver a intentar ir a publicar
      console.log('   → Navegando a publicar...');
      await page.goto(`${CONFIG.baseUrl}/cars/publish`, { waitUntil: 'domcontentloaded' });
      await sleep(3000);
    }

    await screenshot('publish-ready');

    // ========== PASO 2: SELECCIONAR BYD ==========
    console.log('\n🔄 Paso 2: Buscando BYD...');

    // Primero hacer scroll humano para ver todas las marcas
    console.log('   → Scrolleando para ver BYD...');
    await humanScroll(page, 'down', 400);
    await humanWait(800);

    // Buscar BYD en el input de búsqueda con typing humano
    const brandInput = page.locator('input[placeholder*="marca" i], input[placeholder*="Buscar" i], input[type="text"]').first();
    await brandInput.waitFor({ state: 'visible', timeout: 5000 });
    await brandInput.click();
    await sleep(randomDelay(300, 600));

    // Escribir "BYD" caracter por caracter
    for (const char of 'BYD') {
      await brandInput.type(char, { delay: randomDelay(80, 200) });
    }
    await humanWait(2000);
    await screenshot('search-byd');

    // Esperar que aparezca el resultado de búsqueda y hacer CLICK en la imagen/botón de BYD
    console.log('   → Haciendo click en BYD...');

    // Buscar el botón/card de BYD que tiene la imagen del logo
    const bydButton = page.locator('button:has-text("BYD")').first();
    if (await bydButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanClick(page, bydButton);
    } else {
      // Intentar con el resultado de búsqueda
      const bydResult = page.locator('[class*="brand"]:has-text("BYD"), [class*="result"]:has-text("BYD"), div:has-text("BYD") >> visible=true').first();
      await humanClick(page, bydResult);
    }
    await humanWait(1500);
    await screenshot('byd-selected');

    // Verificar que BYD está seleccionado
    const selectedText = await page.locator('text=BYD').first().textContent().catch(() => '');
    if (selectedText?.includes('BYD')) {
      console.log('   ✅ BYD seleccionado correctamente');
    } else {
      console.log('   ⚠️ Verificar selección de BYD');
    }

    // Continuar con click humano
    const continueBtn = page.locator('button:has-text("Continuar")').first();
    await humanClick(page, continueBtn);
    await humanWait(2000);
    await screenshot('after-brand');

    // ========== PASO 3: AÑO ==========
    console.log('\n🔄 Paso 3: Seleccionando año 2024...');
    await humanWait(2000);  // Esperar que la página se estabilice
    const yearBtn = page.locator(`button:has-text("${CONFIG.byd.year}")`).first();
    await yearBtn.waitFor({ state: 'visible', timeout: 10000 });
    await humanClick(page, yearBtn);
    await screenshot('year-selected');

    const continueAfterYear = page.locator('button:has-text("Continuar")').first();
    await humanClick(page, continueAfterYear);
    await humanWait(2000);
    await screenshot('after-year');

    // ========== PASO 4: MODELO ==========
    console.log('\n🔄 Paso 4: Seleccionando modelo Dolphin EV...');
    await screenshot('model-step-start');

    // Buscar modelo en el input con typing humano
    const modelInput = page.locator('input[placeholder*="modelo" i], input[placeholder*="model" i], input[placeholder*="Buscar" i]').first();
    if (await modelInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   → Buscando modelo...');
      await modelInput.click();
      await sleep(randomDelay(300, 500));

      // Escribir "Dolphin" con velocidad variable
      for (const char of CONFIG.byd.model) {
        await modelInput.type(char, { delay: randomDelay(60, 180) });
      }
      await humanWait(2000);
      await screenshot('model-search');
    }

    // Seleccionar modelo de la lista (buscar texto que contenga Dolphin)
    console.log('   → Seleccionando Dolphin EV...');
    const modelOption = page.locator('button:has-text("Dolphin"), [role="option"]:has-text("Dolphin"), li:has-text("Dolphin")').first();
    if (await modelOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, modelOption);
      await humanWait(2000);
    } else {
      // Intentar click en cualquier resultado visible
      const anyResult = page.locator('.search-result, [class*="result"], [class*="option"]').first();
      if (await anyResult.isVisible({ timeout: 3000 }).catch(() => false)) {
        await humanClick(page, anyResult);
        await humanWait(2000);
      }
    }
    await screenshot('model-selected');

    // Esperar que muestre el precio FIPE
    console.log('   → Esperando precio FIPE...');
    await sleep(3000);
    const priceElement = page.locator('text=/R\\$|\\$|precio|price|FIPE/i').first();
    if (await priceElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   ✅ Precio FIPE visible');
    }
    await screenshot('model-with-price');

    // Mostrar resumen de selección
    console.log(`   📋 Seleccionado: ${CONFIG.byd.brand} ${CONFIG.byd.model} ${CONFIG.byd.year}`);

    await page.locator('button:has-text("Continuar")').first().click();
    await sleep(2000);
    await screenshot('after-model');

    // ========== PASO 5: FOTOS ==========
    console.log('\n🔄 Paso 5: Subiendo 3 fotos del BYD...');
    await screenshot('photos-step');

    // Buscar input de archivos
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(CONFIG.images);
      console.log('   ✅ 3 imágenes subidas');
      await sleep(5000);
      await screenshot('photos-uploaded');
    } else {
      console.log('   ⚠️ No se encontró input de archivos');
    }

    await page.locator('button:has-text("Continuar")').first().click();
    await sleep(2000);
    await screenshot('after-photos');

    // ========== PASO 6: KILOMETRAJE ==========
    console.log('\n🔄 Paso 6: Ingresando kilometraje...');
    const kmInput = page.locator('input[placeholder*="km" i], input[placeholder*="kilometr" i], input[type="number"]').first();
    if (await kmInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await kmInput.fill(CONFIG.byd.mileage);
      await sleep(1000);
      await screenshot('mileage-entered');
    }

    await page.locator('button:has-text("Continuar")').first().click();
    await sleep(2000);
    await screenshot('after-mileage');

    // ========== PASO 7: PRECIO ==========
    console.log('\n🔄 Paso 7: Estableciendo precio...');
    const priceInput = page.locator('input[placeholder*="precio" i], input[placeholder*="price" i]').first();
    if (await priceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await priceInput.fill(CONFIG.byd.price);
      await sleep(1000);
      await screenshot('price-entered');
    }

    await page.locator('button:has-text("Continuar")').first().click();
    await sleep(2000);
    await screenshot('after-price');

    // ========== PASO 8: RESUMEN ==========
    console.log('\n🔄 Paso 8: Capturando resumen...');
    await screenshot('summary-final');

    console.log('\n   ⚠️ Demo completado - NO se publica realmente');

    // ========== GENERAR GIF ==========
    console.log('\n🎬 Generando GIF...');
    const { execSync } = await import('child_process');
    const gifPath = path.join(CONFIG.outputDir, 'byd-publication-demo.gif');

    try {
      execSync(`ffmpeg -y -framerate 0.5 -pattern_type glob -i '${CONFIG.screenshotDir}/*.png' -vf "scale=375:-1" -loop 0 "${gifPath}"`, { stdio: 'pipe' });
      console.log(`✅ GIF generado: ${gifPath}`);
    } catch {
      console.log(`📁 Screenshots en: ${CONFIG.screenshotDir}`);
    }

    // ========== RESUMEN ==========
    console.log('\n' + '═'.repeat(60));
    console.log('✅ DEMO COMPLETADO');
    console.log('═'.repeat(60));
    console.log(`📸 Screenshots: ${step} capturas`);
    console.log(`📁 Ubicación: ${CONFIG.screenshotDir}`);

  } catch (error) {
    console.error('\n💥 Error:', error);
    await screenshot('error-state');
  } finally {
    console.log('\n⏸️ Browser abierto - ciérralo manualmente cuando termines');
    // No cerrar el browser para que el usuario pueda ver el resultado
    // await browser.close();
  }
}

main().catch(console.error);
