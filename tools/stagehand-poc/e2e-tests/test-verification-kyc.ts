/**
 * Test E2E - Verificación KYC
 *
 * Flujo: Perfil → Verificación → Subir documentos → Verificación facial
 */

import { chromium } from 'patchright';
import { CONFIG, setupBrowser, createScreenshotter, login, humanClick, humanScroll, humanWait, generateOutputs, sleep } from './shared/test-utils';

async function main() {
  console.log('═'.repeat(60));
  console.log('🪪 TEST E2E - Verificación KYC');
  console.log('═'.repeat(60));

  const { browser, page } = await setupBrowser(chromium, 'test-kyc');
  const screenshot = createScreenshotter('verification-kyc');
  const take = (name: string) => screenshot(page, name);

  try {
    // Login
    await login(page, CONFIG.credentials.renter.email, CONFIG.credentials.renter.password, take);

    // Ir al perfil
    console.log('\n🔄 Accediendo al perfil...');
    await page.goto(`${CONFIG.baseUrl}/profile`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await take('profile-page');

    // Scroll para ver opciones de verificación
    await humanScroll(page, 300);
    await take('profile-scroll');

    // Buscar sección de verificación
    console.log('\n🔄 Buscando opciones de verificación...');
    const verifySection = page.locator('text=/verificar|verificación|documentos|kyc/i').first();
    if (await verifySection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, verifySection);
      await humanWait(2000);
      await take('verification-section');
    }

    // Ir directamente a la página de verificación
    await page.goto(`${CONFIG.baseUrl}/profile/verification`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await take('verification-page');

    // ========== VERIFICACIÓN DE DOCUMENTO (CNH) ==========
    console.log('\n🔄 Verificación de documento (CNH)...');
    const docVerifyBtn = page.locator('button:has-text("CNH"), button:has-text("Documento"), button:has-text("Licencia"), [class*="document"]').first();
    if (await docVerifyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, docVerifyBtn);
      await humanWait(2000);
      await take('document-upload-start');
    }

    // Buscar input de archivo para documento
    const docInput = page.locator('input[type="file"]').first();
    if (await docInput.count() > 0) {
      console.log('   → Input de archivo encontrado');
      await take('document-input-found');

      // Simular que tenemos un archivo de prueba
      // En un test real, aquí subiríamos una imagen
      console.log('   ⚠️ Upload de documento simulado (test seguro)');
    }

    await take('document-upload-state');

    // ========== VERIFICACIÓN FACIAL ==========
    console.log('\n🔄 Verificación facial...');
    await page.goto(`${CONFIG.baseUrl}/profile/verification`, { waitUntil: 'domcontentloaded' });
    await humanWait(2000);

    const faceVerifyBtn = page.locator('button:has-text("Facial"), button:has-text("Selfie"), button:has-text("Rostro"), [class*="face"]').first();
    if (await faceVerifyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, faceVerifyBtn);
      await humanWait(2000);
      await take('face-verification-start');
    }

    // Capturar pantalla de cámara/verificación
    await take('face-camera-screen');

    // ========== VERIFICACIÓN DE TELÉFONO ==========
    console.log('\n🔄 Verificación de teléfono...');
    const phoneVerifyBtn = page.locator('button:has-text("Teléfono"), button:has-text("WhatsApp"), button:has-text("SMS")').first();
    if (await phoneVerifyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanClick(page, phoneVerifyBtn);
      await humanWait(2000);
      await take('phone-verification');
    }

    // ========== ESTADO FINAL ==========
    console.log('\n🔄 Capturando estado final de verificación...');
    await page.goto(`${CONFIG.baseUrl}/profile`, { waitUntil: 'domcontentloaded' });
    await humanWait(2000);
    await take('verification-status');

    await humanScroll(page, 200);
    await take('final-state');

    // Generar outputs
    console.log('\n🎬 Generando videos...');
    const screenshotDir = '/home/edu/autorenta/tools/stagehand-poc/screenshots/verification-kyc';
    await generateOutputs(screenshotDir, 'test-verification-kyc');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST DE VERIFICACIÓN KYC COMPLETADO');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n💥 Error:', error);
    await take('error-state');
  } finally {
    console.log('\n⏸️ Browser abierto - ciérralo manualmente');
  }
}

main().catch(console.error);
