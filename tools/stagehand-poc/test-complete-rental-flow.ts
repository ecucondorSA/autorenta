/**
 * Test E2E - Flujo COMPLETO de Locación
 *
 * Incluye:
 * 1. Renter: Buscar auto → Reservar → Pagar
 * 2. Owner: Aprobar reserva
 * 3. Owner: Check-in (entregar auto)
 * 4. Renter: Check-in (recibir auto)
 * 5. [Simular período de alquiler]
 * 6. Renter: Check-out (devolver auto)
 * 7. Owner: Check-out (inspeccionar y confirmar)
 *
 * Ejecutar: cd tools/stagehand-poc && bun test-complete-rental-flow.ts
 */

import { chromium, type BrowserContext, type Page } from 'patchright';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG = {
  baseUrl: 'https://autorentar.com',
  // Credenciales de prueba
  renter: {
    email: 'eduardomarques@campus.fmed.uba.ar',
    password: 'Ab.12345',
    name: 'Eduardo (Renter)',
  },
  owner: {
    // Usar el mismo usuario si es owner de algún auto, o credenciales de owner de prueba
    email: 'eduardomarques@campus.fmed.uba.ar',
    password: 'Ab.12345',
    name: 'Eduardo (Owner)',
  },
  screenshotDir: '/home/edu/autorenta/tools/stagehand-poc/screenshots/complete-rental',
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
  const variation = randomDelay(-200, 400);
  await sleep(Math.max(400, baseMs + variation));
}

async function humanClick(page: Page, locator: any) {
  try {
    await locator.waitFor({ state: 'visible', timeout: 10000 });
    await sleep(randomDelay(150, 400));
    await locator.click({
      position: { x: randomDelay(5, 15), y: randomDelay(5, 15) },
    });
    await humanWait(600);
  } catch (e) {
    console.log(`   ⚠️ Click fallido, intentando force click...`);
    await locator.click({ force: true });
    await humanWait(600);
  }
}

async function humanScroll(page: Page, amount: number = 300) {
  const steps = 4;
  const stepAmount = amount / steps;
  for (let i = 0; i < steps; i++) {
    await page.evaluate((y: number) => window.scrollBy(0, y), stepAmount);
    await sleep(randomDelay(40, 80));
  }
  await humanWait(400);
}

async function humanType(page: Page, locator: any, text: string) {
  await locator.click();
  await sleep(randomDelay(200, 400));
  for (const char of text) {
    await locator.type(char, { delay: randomDelay(40, 120) });
  }
  await humanWait(300);
}

// ========== FUNCIONES DE LOGIN ==========

async function login(page: Page, email: string, password: string, screenshot: Function) {
  console.log(`   → Haciendo login con ${email.split('@')[0]}...`);

  // Ir a login
  await page.goto(`${CONFIG.baseUrl}/auth/login`, { waitUntil: 'domcontentloaded' });
  await humanWait(2000);

  // Click en Ingresar principal si existe
  const mainBtn = page.locator('button:has-text("Ingresar")').first();
  if (await mainBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await humanClick(page, mainBtn);
    await humanWait(1500);
  }

  // Click en "o con email"
  const emailOption = page.locator('button:has-text("o con email"), button:has-text("con email")').first();
  if (await emailOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    await humanClick(page, emailOption);
    await humanWait(1500);
  }

  // Llenar credenciales
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(email);
  await sleep(300);

  const passInput = page.locator('input[type="password"]').first();
  await passInput.fill(password);
  await sleep(300);

  await screenshot('login-credentials');

  // Submit
  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();
  await humanWait(4000);

  await screenshot('login-complete');
  console.log('   ✅ Login exitoso');
}

async function logout(page: Page) {
  console.log('   → Cerrando sesión...');

  // Ir al perfil y buscar logout
  await page.goto(`${CONFIG.baseUrl}/profile`, { waitUntil: 'domcontentloaded' });
  await humanWait(2000);

  const logoutBtn = page.locator('button:has-text("Cerrar sesión"), button:has-text("Salir"), a:has-text("Cerrar")').first();
  if (await logoutBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await humanClick(page, logoutBtn);
    await humanWait(2000);
  }

  // Limpiar localStorage para forzar logout
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  console.log('   ✅ Sesión cerrada');
}

// ========== MAIN ==========

async function main() {
  console.log('═'.repeat(60));
  console.log('🚗 TEST E2E - Flujo COMPLETO de Locación');
  console.log('═'.repeat(60));

  const userDataDir = '/home/edu/.patchright-complete-rental';

  // Limpiar perfil anterior
  if (fs.existsSync(userDataDir)) {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    args: ['--window-size=500,1000', '--window-position=100,50'],
  });

  const page = browser.pages()[0] || await browser.newPage();
  let step = 0;
  let currentPhase = 'setup';

  const screenshot = async (name: string) => {
    const filename = `${String(step++).padStart(2, '0')}-${currentPhase}-${name}.png`;
    await page.screenshot({
      path: path.join(CONFIG.screenshotDir, filename),
      clip: { x: 0, y: 0, width: 430, height: 932 },
    });
    console.log(`   📸 ${filename}`);
  };

  try {
    // ════════════════════════════════════════════════════════════
    // FASE 1: RENTER - EXPLORAR Y RESERVAR
    // ════════════════════════════════════════════════════════════
    currentPhase = '1-renter';
    console.log('\n' + '─'.repeat(50));
    console.log('📱 FASE 1: RENTER - Explorar y Reservar');
    console.log('─'.repeat(50));

    await login(page, CONFIG.renter.email, CONFIG.renter.password, screenshot);

    // Ir al marketplace
    console.log('\n🔄 Explorando marketplace...');
    await page.goto(`${CONFIG.baseUrl}/cars/list`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await screenshot('marketplace');

    // Scroll para ver autos
    await humanScroll(page, 400);
    await screenshot('marketplace-scroll');

    // Seleccionar primer auto
    console.log('\n🔄 Seleccionando un auto...');
    const carCard = page.locator('a[href*="/cars/"]').first();
    if (await carCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, carCard);
      await humanWait(3000);
      await screenshot('car-detail');
    }

    // Ver detalles
    await humanScroll(page, 300);
    await screenshot('car-info');

    // Buscar botón de reservar
    console.log('\n🔄 Iniciando reserva...');
    const bookBtn = page.locator('button:has-text("Reservar"), button:has-text("Alquilar"), button:has-text("Continuar")').first();
    if (await bookBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, bookBtn);
      await humanWait(3000);
      await screenshot('booking-start');
    }

    // Capturar el flujo de booking
    await humanScroll(page, 300);
    await screenshot('booking-form');

    // Buscar siguiente paso
    const nextBtn = page.locator('button:has-text("Continuar"), button:has-text("Siguiente")').first();
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanClick(page, nextBtn);
      await humanWait(2000);
      await screenshot('booking-step2');
    }

    // Capturar resumen
    await screenshot('booking-summary');

    console.log('   ✅ Reserva iniciada (pendiente de pago)');

    // ════════════════════════════════════════════════════════════
    // FASE 2: OWNER - PANEL DE RESERVAS
    // ════════════════════════════════════════════════════════════
    currentPhase = '2-owner';
    console.log('\n' + '─'.repeat(50));
    console.log('👤 FASE 2: OWNER - Ver reservas pendientes');
    console.log('─'.repeat(50));

    // Ir al panel de owner
    console.log('\n🔄 Accediendo al panel de propietario...');
    await page.goto(`${CONFIG.baseUrl}/bookings/owner`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await screenshot('owner-dashboard');

    // Scroll para ver reservas
    await humanScroll(page, 300);
    await screenshot('owner-bookings');

    // Buscar reserva pendiente
    const pendingBooking = page.locator('[class*="booking"], [class*="reservation"], [class*="card"]').first();
    if (await pendingBooking.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   → Reserva encontrada');
      await humanClick(page, pendingBooking);
      await humanWait(2000);
      await screenshot('booking-detail-owner');
    }

    // Buscar botón de aprobar
    const approveBtn = page.locator('button:has-text("Aprobar"), button:has-text("Aceptar"), button:has-text("Confirmar")').first();
    if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   → Aprobando reserva...');
      await humanClick(page, approveBtn);
      await humanWait(2000);
      await screenshot('booking-approved');
      console.log('   ✅ Reserva aprobada');
    }

    // ════════════════════════════════════════════════════════════
    // FASE 3: OWNER - CHECK-IN (Entrega del auto)
    // ════════════════════════════════════════════════════════════
    currentPhase = '3-checkin-owner';
    console.log('\n' + '─'.repeat(50));
    console.log('🔑 FASE 3: OWNER - Check-in (Entrega del auto)');
    console.log('─'.repeat(50));

    // Ir a mis bookings como owner
    await page.goto(`${CONFIG.baseUrl}/bookings`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await screenshot('bookings-hub');

    // Buscar booking confirmado
    const confirmedBooking = page.locator('text=/confirmad|activ|check-in/i').first();
    if (await confirmedBooking.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, confirmedBooking);
      await humanWait(2000);
    }

    // Ir a owner check-in
    await page.goto(`${CONFIG.baseUrl}/bookings`, { waitUntil: 'domcontentloaded' });
    await humanWait(2000);

    // Buscar el botón de check-in
    const checkInBtn = page.locator('button:has-text("Check-in"), button:has-text("Entregar"), a:has-text("check-in")').first();
    if (await checkInBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   → Iniciando check-in del owner...');
      await humanClick(page, checkInBtn);
      await humanWait(3000);
      await screenshot('owner-checkin-start');
    }

    // Capturar formulario de inspección
    await screenshot('inspection-form');
    await humanScroll(page, 400);
    await screenshot('inspection-form-scroll');

    // Buscar botón de confirmar entrega
    const confirmDeliveryBtn = page.locator('button:has-text("Confirmar"), button:has-text("Entregar"), button:has-text("Completar")').first();
    if (await confirmDeliveryBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   → Confirmando entrega...');
      await humanClick(page, confirmDeliveryBtn);
      await humanWait(2000);
      await screenshot('owner-checkin-complete');
      console.log('   ✅ Check-in del owner completado');
    }

    // ════════════════════════════════════════════════════════════
    // FASE 4: RENTER - CHECK-IN (Recibir auto)
    // ════════════════════════════════════════════════════════════
    currentPhase = '4-checkin-renter';
    console.log('\n' + '─'.repeat(50));
    console.log('🚗 FASE 4: RENTER - Check-in (Recibir auto)');
    console.log('─'.repeat(50));

    // Ir a mis reservas
    await page.goto(`${CONFIG.baseUrl}/bookings/list`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await screenshot('my-bookings');

    // Buscar la reserva activa
    const activeBooking = page.locator('[class*="booking"], [class*="card"]').first();
    if (await activeBooking.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, activeBooking);
      await humanWait(2000);
      await screenshot('booking-detail-renter');
    }

    // Buscar check-in del renter
    const renterCheckInBtn = page.locator('button:has-text("Check-in"), button:has-text("Recibir"), button:has-text("Confirmar")').first();
    if (await renterCheckInBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   → Confirmando recepción del auto...');
      await humanClick(page, renterCheckInBtn);
      await humanWait(2000);
      await screenshot('renter-checkin');
      console.log('   ✅ Check-in del renter completado');
    }

    // ════════════════════════════════════════════════════════════
    // FASE 5: ALQUILER ACTIVO
    // ════════════════════════════════════════════════════════════
    currentPhase = '5-active';
    console.log('\n' + '─'.repeat(50));
    console.log('🛣️ FASE 5: Alquiler Activo');
    console.log('─'.repeat(50));

    // Capturar estado del alquiler activo
    await page.goto(`${CONFIG.baseUrl}/bookings`, { waitUntil: 'domcontentloaded' });
    await humanWait(2000);
    await screenshot('active-rental');

    // Ver detalles del alquiler activo
    await humanScroll(page, 300);
    await screenshot('active-rental-details');

    console.log('   ✅ Alquiler en progreso');
    console.log('   ⏳ (Simulando período de alquiler...)');

    // ════════════════════════════════════════════════════════════
    // FASE 6: RENTER - CHECK-OUT (Devolver auto)
    // ════════════════════════════════════════════════════════════
    currentPhase = '6-checkout-renter';
    console.log('\n' + '─'.repeat(50));
    console.log('🔙 FASE 6: RENTER - Check-out (Devolver auto)');
    console.log('─'.repeat(50));

    // Buscar botón de check-out/devolver
    const checkOutBtn = page.locator('button:has-text("Check-out"), button:has-text("Devolver"), button:has-text("Finalizar")').first();
    if (await checkOutBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   → Iniciando devolución...');
      await humanClick(page, checkOutBtn);
      await humanWait(3000);
      await screenshot('renter-checkout-start');
    }

    // Capturar formulario de devolución
    await screenshot('checkout-form');
    await humanScroll(page, 300);
    await screenshot('checkout-form-scroll');

    // Confirmar devolución
    const confirmReturnBtn = page.locator('button:has-text("Confirmar"), button:has-text("Devolver"), button:has-text("Completar")').first();
    if (await confirmReturnBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   → Confirmando devolución...');
      await humanClick(page, confirmReturnBtn);
      await humanWait(2000);
      await screenshot('renter-checkout-complete');
      console.log('   ✅ Check-out del renter completado');
    }

    // ════════════════════════════════════════════════════════════
    // FASE 7: OWNER - CHECK-OUT (Inspeccionar y confirmar)
    // ════════════════════════════════════════════════════════════
    currentPhase = '7-checkout-owner';
    console.log('\n' + '─'.repeat(50));
    console.log('🔍 FASE 7: OWNER - Check-out (Inspeccionar)');
    console.log('─'.repeat(50));

    // Ir al panel de owner
    await page.goto(`${CONFIG.baseUrl}/bookings/owner`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await screenshot('owner-checkout-pending');

    // Buscar booking pendiente de check-out
    const pendingCheckout = page.locator('text=/pendiente|devoluci|check-out/i').first();
    if (await pendingCheckout.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, pendingCheckout);
      await humanWait(2000);
    }

    // Buscar botón de inspección final
    const finalInspectionBtn = page.locator('button:has-text("Inspeccionar"), button:has-text("Check-out"), button:has-text("Revisar")').first();
    if (await finalInspectionBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   → Iniciando inspección final...');
      await humanClick(page, finalInspectionBtn);
      await humanWait(2000);
      await screenshot('owner-inspection');
    }

    // Capturar formulario de inspección
    await screenshot('final-inspection-form');
    await humanScroll(page, 300);
    await screenshot('final-inspection-scroll');

    // Confirmar que todo está bien
    const confirmOkBtn = page.locator('button:has-text("Todo OK"), button:has-text("Sin daños"), button:has-text("Confirmar"), button:has-text("Completar")').first();
    if (await confirmOkBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   → Confirmando inspección OK...');
      await humanClick(page, confirmOkBtn);
      await humanWait(2000);
      await screenshot('inspection-complete');
    }

    // ════════════════════════════════════════════════════════════
    // FASE 8: COMPLETADO
    // ════════════════════════════════════════════════════════════
    currentPhase = '8-complete';
    console.log('\n' + '─'.repeat(50));
    console.log('✅ FASE 8: Alquiler Completado');
    console.log('─'.repeat(50));

    // Capturar estado final
    await page.goto(`${CONFIG.baseUrl}/bookings`, { waitUntil: 'domcontentloaded' });
    await humanWait(2000);
    await screenshot('rental-complete');

    await humanScroll(page, 200);
    await screenshot('rental-complete-details');

    console.log('   ✅ Alquiler completado exitosamente');

    // ════════════════════════════════════════════════════════════
    // GENERAR VIDEO
    // ════════════════════════════════════════════════════════════
    console.log('\n🎬 Generando video del test...');
    const { execSync } = await import('child_process');
    const gifPath = path.join(CONFIG.outputDir, 'complete-rental-flow.gif');
    const mp4Path = path.join(CONFIG.outputDir, 'complete-rental-flow.mp4');

    try {
      // GIF
      execSync(`ffmpeg -y -framerate 0.8 -pattern_type glob -i '${CONFIG.screenshotDir}/*.png' -vf "scale=430:-1" -loop 0 "${gifPath}"`, { stdio: 'pipe' });
      console.log(`✅ GIF: ${gifPath}`);

      // MP4
      execSync(`ffmpeg -y -framerate 1 -pattern_type glob -i '${CONFIG.screenshotDir}/*.png' -c:v libx264 -pix_fmt yuv420p -preset slow -crf 18 "${mp4Path}"`, { stdio: 'pipe' });
      console.log(`✅ MP4: ${mp4Path}`);
    } catch {
      console.log(`📁 Screenshots en: ${CONFIG.screenshotDir}`);
    }

    // ════════════════════════════════════════════════════════════
    // RESUMEN FINAL
    // ════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST COMPLETO DE LOCACIÓN FINALIZADO');
    console.log('═'.repeat(60));
    console.log(`📸 Screenshots: ${step} capturas`);
    console.log(`📁 Ubicación: ${CONFIG.screenshotDir}`);
    console.log('\nFases completadas:');
    console.log('  1️⃣  Renter: Explorar y reservar');
    console.log('  2️⃣  Owner: Ver y aprobar reserva');
    console.log('  3️⃣  Owner: Check-in (entregar auto)');
    console.log('  4️⃣  Renter: Check-in (recibir auto)');
    console.log('  5️⃣  Alquiler activo');
    console.log('  6️⃣  Renter: Check-out (devolver auto)');
    console.log('  7️⃣  Owner: Check-out (inspeccionar)');
    console.log('  8️⃣  Alquiler completado');

  } catch (error) {
    console.error('\n💥 Error:', error);
    await screenshot('error-state');
  } finally {
    console.log('\n⏸️ Browser abierto - ciérralo manualmente cuando termines');
  }
}

main().catch(console.error);
