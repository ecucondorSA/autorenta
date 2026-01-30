/**
 * Test E2E - Flujo completo de Locación/Booking
 *
 * Flujo: Marketplace → Car Detail → Seleccionar fechas → Checkout → Confirmación
 *
 * Ejecutar: cd tools/stagehand-poc && bun test-booking-flow.ts
 */

import { chromium } from 'patchright';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG = {
  baseUrl: 'https://autorentar.com',
  credentials: {
    // Renter (arrendatario)
    email: 'eduardomarques@campus.fmed.uba.ar',
    password: 'Ab.12345',
  },
  booking: {
    // Buscar un auto disponible
    searchQuery: '',  // Vacío para ver todos
    // Fechas de reserva (mañana + 3 días)
    daysFromNow: 1,
    duration: 3,
  },
  screenshotDir: '/home/edu/autorenta/tools/stagehand-poc/screenshots/booking-test',
  outputDir: '/home/edu/autorenta/marketing/demos',
};

// Crear directorios
fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
fs.mkdirSync(CONFIG.outputDir, { recursive: true });

// Limpiar screenshots anteriores
for (const file of fs.readdirSync(CONFIG.screenshotDir)) {
  if (file.endsWith('.png')) fs.unlinkSync(path.join(CONFIG.screenshotDir, file));
}

// ========== UTILIDADES ==========

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function humanWait(baseMs: number = 1000) {
  const variation = randomDelay(-300, 500);
  await sleep(Math.max(500, baseMs + variation));
}

async function humanClick(page: any, locator: any) {
  await locator.waitFor({ state: 'visible', timeout: 15000 });
  await sleep(randomDelay(200, 500));
  await locator.click({
    position: {
      x: randomDelay(5, 15),
      y: randomDelay(5, 15),
    },
  });
  await humanWait(800);
}

async function humanScroll(page: any, direction: 'down' | 'up' = 'down', amount: number = 300) {
  const scrollY = direction === 'down' ? amount : -amount;
  const steps = 5;
  const stepAmount = scrollY / steps;

  for (let i = 0; i < steps; i++) {
    await page.evaluate((y: number) => window.scrollBy(0, y), stepAmount);
    await sleep(randomDelay(50, 100));
  }
  await humanWait(500);
}

// Calcular fechas de reserva
function getBookingDates() {
  const start = new Date();
  start.setDate(start.getDate() + CONFIG.booking.daysFromNow);

  const end = new Date(start);
  end.setDate(end.getDate() + CONFIG.booking.duration);

  return {
    start,
    end,
    startFormatted: start.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }),
    endFormatted: end.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }),
  };
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🚗 TEST E2E - Flujo de Locación/Booking');
  console.log('═'.repeat(60));

  const dates = getBookingDates();
  console.log(`📅 Fechas de reserva: ${dates.startFormatted} → ${dates.endFormatted}`);

  // Usar perfil persistente para mantener sesión
  const userDataDir = '/home/edu/.patchright-booking-test';

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    args: [
      '--window-size=500,1000',
      '--window-position=100,50',
      '--force-device-scale-factor=1',
    ],
  });

  const page = browser.pages()[0] || await browser.newPage();
  let step = 0;

  const screenshot = async (name: string) => {
    const filename = `${String(step++).padStart(2, '0')}-${name}.png`;
    await page.screenshot({
      path: path.join(CONFIG.screenshotDir, filename),
      clip: { x: 0, y: 0, width: 430, height: 932 },
    });
    console.log(`   📸 ${filename}`);
  };

  try {
    // ========== PASO 0: LIMPIAR ESTADO ==========
    console.log('\n🔄 Paso 0: Preparando test...');
    await page.goto(CONFIG.baseUrl, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    // Limpiar estado de booking anterior
    await page.evaluate(() => {
      const keysToRemove = Object.keys(localStorage).filter(k =>
        k.includes('booking') || k.includes('cart') || k.includes('checkout')
      );
      keysToRemove.forEach(k => localStorage.removeItem(k));
    });
    console.log('   ✅ Estado limpiado');

    // ========== PASO 1: LOGIN SI ES NECESARIO ==========
    console.log('\n🔄 Paso 1: Verificando sesión...');
    await page.goto(`${CONFIG.baseUrl}/cars/list`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await screenshot('marketplace-initial');

    const url = page.url();
    if (url.includes('/auth/login') || url.includes('/auth')) {
      console.log('   → Necesita login...');
      await screenshot('needs-login');

      await sleep(2000);

      // Click en Ingresar principal
      const mainIngresar = page.locator('button:has-text("Ingresar")').first();
      if (await mainIngresar.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('   → Click en Ingresar...');
        await humanClick(page, mainIngresar);
        await screenshot('after-ingresar');
      }

      // Click en "o con email"
      const emailOption = page.locator('button:has-text("o con email"), button:has-text("con email")').first();
      if (await emailOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('   → Click en "o con email"...');
        await humanClick(page, emailOption);
        await screenshot('email-form');
      }

      // Llenar credenciales
      console.log('   → Llenando credenciales...');
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      await emailInput.waitFor({ state: 'visible', timeout: 10000 });
      await emailInput.fill(CONFIG.credentials.email);
      await sleep(500);

      const passInput = page.locator('input[type="password"]').first();
      await passInput.waitFor({ state: 'visible', timeout: 5000 });
      await passInput.fill(CONFIG.credentials.password);
      await sleep(500);
      await screenshot('credentials-filled');

      // Submit
      const submitBtn = page.locator('button[type="submit"]:has-text("Ingresar")').first();
      console.log('   → Enviando login...');
      await submitBtn.click();
      await sleep(5000);
      await screenshot('post-login');

      // Volver al marketplace
      await page.goto(`${CONFIG.baseUrl}/cars/list`, { waitUntil: 'domcontentloaded' });
      await humanWait(3000);
    }

    await screenshot('marketplace-ready');
    console.log('   ✅ Sesión activa');

    // ========== PASO 2: EXPLORAR MARKETPLACE ==========
    console.log('\n🔄 Paso 2: Explorando autos disponibles...');

    // Scroll para ver más autos
    await humanScroll(page, 'down', 300);
    await screenshot('marketplace-scroll1');

    await humanScroll(page, 'down', 300);
    await screenshot('marketplace-scroll2');

    // ========== PASO 3: SELECCIONAR UN AUTO ==========
    console.log('\n🔄 Paso 3: Seleccionando un auto...');

    // Buscar cards de autos disponibles
    const carCards = page.locator('[data-testid="car-card"], .car-card, [class*="car-card"], a[href*="/cars/"]');
    const carCount = await carCards.count();
    console.log(`   → Encontrados ${carCount} autos`);

    if (carCount > 0) {
      // Seleccionar el primer auto disponible
      const firstCar = carCards.first();
      await screenshot('before-car-select');

      console.log('   → Haciendo click en el primer auto...');
      await humanClick(page, firstCar);
      await humanWait(3000);
      await screenshot('car-detail');
    } else {
      console.log('   ⚠️ No se encontraron autos, intentando con selector alternativo...');
      // Intentar con cualquier enlace que lleve a detalle de auto
      const anyCarLink = page.locator('a[href*="/cars/"]').first();
      if (await anyCarLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await humanClick(page, anyCarLink);
        await humanWait(3000);
        await screenshot('car-detail-alt');
      }
    }

    // ========== PASO 4: VER DETALLES DEL AUTO ==========
    console.log('\n🔄 Paso 4: Revisando detalles del auto...');

    // Scroll para ver más info
    await humanScroll(page, 'down', 400);
    await screenshot('car-detail-scroll1');

    // Buscar precio
    const priceElement = page.locator('text=/R\\$|\\$|día|day/i').first();
    if (await priceElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      const priceText = await priceElement.textContent();
      console.log(`   💰 Precio encontrado: ${priceText}`);
    }

    await humanScroll(page, 'down', 300);
    await screenshot('car-detail-scroll2');

    // ========== PASO 5: SELECCIONAR FECHAS ==========
    console.log('\n🔄 Paso 5: Seleccionando fechas de reserva...');

    // Buscar el selector de fechas o botón de reservar
    const datePickerBtn = page.locator('button:has-text("fecha"), button:has-text("Reservar"), button:has-text("Alquilar"), [data-testid="date-picker"]').first();

    if (await datePickerBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   → Abriendo selector de fechas...');
      await humanClick(page, datePickerBtn);
      await humanWait(2000);
      await screenshot('date-picker-open');
    }

    // Intentar con inputs de fecha fallback
    const dateFromInput = page.locator('[data-testid="date-fallback-from"], input[placeholder*="inicio" i], input[placeholder*="desde" i]').first();
    const dateToInput = page.locator('[data-testid="date-fallback-to"], input[placeholder*="fin" i], input[placeholder*="hasta" i]').first();

    if (await dateFromInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   → Usando inputs de fecha fallback...');

      // Formato: YYYY-MM-DD
      const startStr = dates.start.toISOString().split('T')[0];
      const endStr = dates.end.toISOString().split('T')[0];

      await dateFromInput.fill(startStr);
      await sleep(500);
      await dateToInput.fill(endStr);
      await sleep(500);
      await screenshot('dates-filled');
    } else {
      // Intentar con el calendario visual (Flatpickr)
      console.log('   → Buscando calendario visual...');

      // Click en el input que abre el calendario
      const calendarTrigger = page.locator('.flatpickr-input, input[readonly], [class*="date-input"]').first();
      if (await calendarTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
        await humanClick(page, calendarTrigger);
        await humanWait(1000);
        await screenshot('calendar-open');

        // Seleccionar día de inicio (buscar el número del día)
        const startDay = dates.start.getDate();
        const dayBtn = page.locator(`.flatpickr-day:has-text("${startDay}")`).first();
        if (await dayBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await humanClick(page, dayBtn);
          await screenshot('start-date-selected');
        }
      }
    }

    await screenshot('dates-selected');

    // ========== PASO 6: CONTINUAR A CHECKOUT ==========
    console.log('\n🔄 Paso 6: Continuando a checkout...');

    // Buscar botón de continuar/reservar
    const continueBtn = page.locator('button:has-text("Continuar"), button:has-text("Reservar"), button:has-text("Siguiente"), button:has-text("Checkout")').first();

    if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   → Click en Continuar...');
      await humanClick(page, continueBtn);
      await humanWait(3000);
      await screenshot('checkout-page');
    }

    // ========== PASO 7: REVISAR RESUMEN DE RESERVA ==========
    console.log('\n🔄 Paso 7: Revisando resumen de reserva...');
    await screenshot('booking-summary');

    // Scroll para ver todo el resumen
    await humanScroll(page, 'down', 400);
    await screenshot('booking-summary-scroll');

    // Buscar el desglose de precios
    const pricingBreakdown = page.locator('[class*="pricing"], [class*="breakdown"], [class*="summary"]').first();
    if (await pricingBreakdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✅ Desglose de precios visible');
    }

    // ========== PASO 8: SELECCIONAR MÉTODO DE PAGO ==========
    console.log('\n🔄 Paso 8: Seleccionando método de pago...');

    // Buscar opciones de pago (MercadoPago, PayPal)
    const mercadoPagoBtn = page.locator('button:has-text("MercadoPago"), button:has-text("Mercado Pago"), [data-payment="mercadopago"]').first();
    const paypalBtn = page.locator('button:has-text("PayPal"), [data-payment="paypal"]').first();

    if (await mercadoPagoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   → Seleccionando MercadoPago...');
      await humanClick(page, mercadoPagoBtn);
      await screenshot('payment-mercadopago');
    } else if (await paypalBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   → Seleccionando PayPal...');
      await humanClick(page, paypalBtn);
      await screenshot('payment-paypal');
    }

    await screenshot('payment-selected');

    // ========== PASO 9: CONFIRMAR RESERVA (SIN PAGO REAL) ==========
    console.log('\n🔄 Paso 9: Capturando estado final...');
    await screenshot('final-state');

    // Scroll final
    await humanScroll(page, 'up', 200);
    await screenshot('final-summary');

    console.log('\n   ⚠️ Test completado - NO se realiza pago real');

    // ========== GENERAR GIF ==========
    console.log('\n🎬 Generando GIF del test...');
    const { execSync } = await import('child_process');
    const gifPath = path.join(CONFIG.outputDir, 'booking-flow-test.gif');

    try {
      execSync(`ffmpeg -y -framerate 0.7 -pattern_type glob -i '${CONFIG.screenshotDir}/*.png' -vf "scale=430:-1" -loop 0 "${gifPath}"`, { stdio: 'pipe' });
      console.log(`✅ GIF generado: ${gifPath}`);
    } catch {
      console.log(`📁 Screenshots en: ${CONFIG.screenshotDir}`);
    }

    // ========== RESUMEN ==========
    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST DE BOOKING COMPLETADO');
    console.log('═'.repeat(60));
    console.log(`📸 Screenshots: ${step} capturas`);
    console.log(`📁 Ubicación: ${CONFIG.screenshotDir}`);
    console.log(`📅 Fechas probadas: ${dates.startFormatted} → ${dates.endFormatted}`);

  } catch (error) {
    console.error('\n💥 Error:', error);
    await screenshot('error-state');
  } finally {
    console.log('\n⏸️ Browser abierto - ciérralo manualmente cuando termines');
  }
}

main().catch(console.error);
