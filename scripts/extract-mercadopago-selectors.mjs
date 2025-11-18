#!/usr/bin/env node

/**
 * Script para extraer selectores del SDK de MercadoPago CardForm
 *
 * Navega a la página de checkout y extrae todos los selectores relevantes
 * del formulario de tarjeta de MercadoPago.
 */

import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200';
const CHROME_WS = process.env.CHROME_CDP_WS_ENDPOINT || process.env.CDP_WS;

// Selectores del SDK de MercadoPago CardForm
const MERCADOPAGO_SELECTORS = {
  // Contenedor principal
  container: '.mp-card-form-container',
  component: 'app-mercadopago-card-form',

  // Formulario
  form: 'form#form-checkout',

  // Campos del SDK (iframes de MercadoPago)
  cardNumber: '#form-checkout__cardNumber',
  expirationDate: '#form-checkout__expirationDate',
  securityCode: '#form-checkout__securityCode',

  // Campos de texto normales
  cardholderName: '#form-checkout__cardholderName',
  identificationType: '#form-checkout__identificationType',
  identificationNumber: '#form-checkout__identificationNumber',

  // Campos ocultos (manejados por SDK)
  installments: '#form-checkout__installments',
  issuer: '#form-checkout__issuer',

  // Botón de envío
  submitButton: 'form#form-checkout button[type="submit"]',

  // Mensajes de error
  errorMessage: '.error-message, [class*="error"]',

  // Labels
  labels: {
    cardNumber: 'label:has-text("Número de Tarjeta")',
    expirationDate: 'label:has-text("Vencimiento")',
    securityCode: 'label:has-text("CVV")',
    cardholderName: 'label:has-text("Titular de la Tarjeta")',
    identificationType: 'label:has-text("Tipo de Documento")',
    identificationNumber: 'label:has-text("Número de Documento")',
  },

  // Título
  title: 'h3:has-text("Información de Pago")',

  // Mensaje de seguridad
  securityMessage: 'p:has-text("Tus datos están protegidos")',
};

async function extractSelectors() {
  console.log('🔍 Extrayendo selectores del SDK de MercadoPago...\n');

  let browser;

  try {
    // Conectar a Chrome existente o crear uno nuevo
    if (CHROME_WS) {
      console.log(`📡 Conectando a Chrome via CDP: ${CHROME_WS}`);
      browser = await chromium.connectOverCDP(CHROME_WS);
    } else {
      console.log('🚀 Iniciando nuevo navegador...');
      browser = await chromium.launch({ headless: false });
    }

    const context = await browser.newContext();
    const page = await context.newPage();

    // Esperar a que el servidor esté listo
    console.log(`⏳ Esperando servidor en ${BASE_URL}...`);
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (error) {
      console.error('❌ No se pudo conectar al servidor. Asegúrate de que esté corriendo:');
      console.error('   npm run dev:web');
      throw error;
    }

    console.log('✅ Servidor conectado\n');

    // Buscar rutas donde está el SDK
    const routes = [
      '/bookings', // Página de bookings (necesitará un bookingId real)
    ];

    console.log('📋 Selectores del SDK de MercadoPago CardForm:\n');
    console.log('═'.repeat(60));

    // Mostrar todos los selectores
    for (const [key, selector] of Object.entries(MERCADOPAGO_SELECTORS)) {
      if (typeof selector === 'string') {
        console.log(`${key.padEnd(25)}: ${selector}`);
      } else if (typeof selector === 'object') {
        console.log(`\n${key}:`);
        for (const [subKey, subSelector] of Object.entries(selector)) {
          console.log(`  ${subKey.padEnd(23)}: ${subSelector}`);
        }
      }
    }

    console.log('\n' + '═'.repeat(60));

    // Guardar selectores en archivo JSON
    const outputFile = 'tmp/mercadopago-selectors.json';
    fs.mkdirSync('tmp', { recursive: true });
    fs.writeFileSync(
      outputFile,
      JSON.stringify(MERCADOPAGO_SELECTORS, null, 2),
      'utf-8'
    );

    console.log(`\n💾 Selectores guardados en: ${outputFile}`);

    // Intentar encontrar el componente en la página actual
    console.log('\n🔎 Buscando componente en la página actual...');
    const componentExists = await page.locator(MERCADOPAGO_SELECTORS.component).count();

    if (componentExists > 0) {
      console.log(`✅ Componente encontrado (${componentExists} instancia(s))`);

      // Verificar cada selector
      console.log('\n📊 Verificación de selectores:');
      for (const [key, selector] of Object.entries(MERCADOPAGO_SELECTORS)) {
        if (typeof selector === 'string' && !selector.includes('has-text')) {
          const count = await page.locator(selector).count();
          const status = count > 0 ? '✅' : '❌';
          console.log(`  ${status} ${key.padEnd(25)}: ${count} elemento(s)`);
        }
      }
    } else {
      console.log('⚠️  Componente no encontrado en la página actual');
      console.log('\n💡 Para ver el SDK, navega a:');
      console.log('   - /bookings/:bookingId/checkout');
      console.log('   - /bookings/:bookingId/payment');
      console.log('\n   Y haz click en "Pagar con MercadoPago" para mostrar el CardForm');
    }

    // Generar código de ejemplo para Playwright
    const playwrightExample = `
// Ejemplo de uso de selectores en Playwright
import { test, expect } from '@playwright/test';

test('MercadoPago CardForm selectors', async ({ page }) => {
  // Navegar a checkout
  await page.goto('/bookings/:bookingId/checkout');

  // Esperar a que aparezca el CardForm
  await page.locator('app-mercadopago-card-form').waitFor();

  // Verificar que el formulario esté visible
  await expect(page.locator('form#form-checkout')).toBeVisible();

  // Los campos de tarjeta son iframes, usar locator directamente
  const cardNumber = page.locator('#form-checkout__cardNumber');
  const expirationDate = page.locator('#form-checkout__expirationDate');
  const securityCode = page.locator('#form-checkout__securityCode');

  // Campos de texto normales
  await page.fill('#form-checkout__cardholderName', 'NOMBRE APELLIDO');
  await page.selectOption('#form-checkout__identificationType', 'DNI');
  await page.fill('#form-checkout__identificationNumber', '12345678');

  // Botón de envío
  await page.click('form#form-checkout button[type="submit"]');
});
`.trim();

    const exampleFile = 'tmp/mercadopago-selectors-example.ts';
    fs.writeFileSync(exampleFile, playwrightExample, 'utf-8');
    console.log(`\n📝 Ejemplo de código guardado en: ${exampleFile}`);

    console.log('\n✅ Extracción completada!\n');

    // Mantener el navegador abierto para inspección manual
    console.log('💡 El navegador permanecerá abierto para inspección manual.');
    console.log('   Presiona Ctrl+C para cerrar.\n');

    // Esperar indefinidamente (usuario puede cerrar con Ctrl+C)
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      // No cerrar el navegador si está conectado vía CDP
      if (!CHROME_WS) {
        await browser.close();
      }
    }
  }
}

extractSelectors().catch(console.error);



