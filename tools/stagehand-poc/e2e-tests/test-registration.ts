/**
 * Test E2E - Registro de Usuario
 *
 * Flujo: Home → Registrarse → Formulario → Verificación
 */

import { chromium } from 'patchright';
import { CONFIG, setupBrowser, createScreenshotter, humanClick, humanScroll, humanWait, humanFill, generateOutputs, sleep } from './shared/test-utils';

async function main() {
  console.log('═'.repeat(60));
  console.log('👤 TEST E2E - Registro de Usuario');
  console.log('═'.repeat(60));

  const { browser, page } = await setupBrowser(chromium, 'test-register');
  const screenshot = createScreenshotter('registration');
  const take = (name: string) => screenshot(page, name);

  // Generar email único para test
  const testEmail = `test.${Date.now()}@autorentatest.com`;

  try {
    // Ir a la página de registro
    console.log('\n🔄 Accediendo a registro...');
    await page.goto(`${CONFIG.baseUrl}/auth/register`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await take('register-page');

    // Buscar opciones de registro
    console.log('\n🔄 Explorando opciones de registro...');

    // Opción de Google
    const googleBtn = page.locator('button:has-text("Google"), [class*="google"]').first();
    if (await googleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   → Opción Google disponible');
      await take('google-option');
    }

    // Opción de Apple
    const appleBtn = page.locator('button:has-text("Apple"), [class*="apple"]').first();
    if (await appleBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   → Opción Apple disponible');
    }

    // Opción de email
    const emailOption = page.locator('button:has-text("email"), button:has-text("Registrar"), a:has-text("email")').first();
    if (await emailOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanClick(page, emailOption);
      await humanWait(2000);
      await take('email-register-form');
    }

    // ========== LLENAR FORMULARIO ==========
    console.log('\n🔄 Llenando formulario de registro...');

    // Nombre
    const nameInput = page.locator('input[name="name"], input[placeholder*="nombre" i]').first();
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanFill(nameInput, 'Test Usuario');
      await take('name-filled');
    }

    // Email
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanFill(emailInput, testEmail);
      await sleep(300);
    }

    // Teléfono
    const phoneInput = page.locator('input[type="tel"], input[name="phone"]').first();
    if (await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await humanFill(phoneInput, '+5511999999999');
    }

    // Password
    const passInput = page.locator('input[type="password"]').first();
    if (await passInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await humanFill(passInput, 'TestPassword123!');
    }

    // Confirmar password
    const confirmPassInput = page.locator('input[name="confirmPassword"], input[placeholder*="confirmar" i]').first();
    if (await confirmPassInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await humanFill(confirmPassInput, 'TestPassword123!');
    }

    await take('form-filled');

    // Scroll para ver términos
    await humanScroll(page, 200);
    await take('form-scroll');

    // Aceptar términos
    const termsCheckbox = page.locator('input[type="checkbox"], [role="checkbox"]').first();
    if (await termsCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await humanClick(page, termsCheckbox);
      await take('terms-accepted');
    }

    // Capturar botón de registro
    const registerBtn = page.locator('button[type="submit"], button:has-text("Registrar"), button:has-text("Crear cuenta")').first();
    if (await registerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✅ Formulario de registro listo');
      await take('ready-to-register');
      console.log('   ⚠️ NO se crea la cuenta real (test seguro)');
    }

    // ========== VERIFICACIÓN DE EMAIL ==========
    console.log('\n🔄 Simulando pantalla de verificación...');
    await page.goto(`${CONFIG.baseUrl}/auth/verify-email`, { waitUntil: 'domcontentloaded' });
    await humanWait(2000);
    await take('verify-email-screen');

    // OTP input
    const otpInput = page.locator('input[name="otp"], input[maxlength="6"], input[type="number"]').first();
    if (await otpInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   → Pantalla de OTP visible');
      await take('otp-input');
    }

    await take('final-state');

    // Generar outputs
    console.log('\n🎬 Generando videos...');
    const screenshotDir = '/home/edu/autorenta/tools/stagehand-poc/screenshots/registration';
    await generateOutputs(screenshotDir, 'test-registration');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST DE REGISTRO COMPLETADO');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n💥 Error:', error);
    await take('error-state');
  } finally {
    console.log('\n⏸️ Browser abierto - ciérralo manualmente');
  }
}

main().catch(console.error);
