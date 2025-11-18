#!/usr/bin/env node

/**
 * Script para diagnosticar error de checkout y extraer selectores del SDK
 *
 * 1. Verifica autenticación
 * 2. Navega a checkout
 * 3. Extrae selectores del SDK de MercadoPago cuando esté visible
 */

import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200';
const CHROME_WS = process.env.CHROME_CDP_WS_ENDPOINT || process.env.CDP_WS;

async function debugCheckout() {
  console.log('🔍 Diagnosticando error de checkout y extrayendo selectores...\n');

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

    // Navegar a la página principal
    console.log(`⏳ Navegando a ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Verificar si hay error visible
    const errorElement = await page.locator('.error-container').first();
    const hasError = await errorElement.count() > 0;

    if (hasError) {
      const errorText = await errorElement.textContent();
      console.log('\n❌ Error encontrado en la página:');
      console.log(`   ${errorText}\n`);

      // Intentar obtener más información del error
      const errorMessage = await page.locator('.error-message, .error-title').first().textContent().catch(() => null);
      if (errorMessage) {
        console.log(`   Mensaje: ${errorMessage}`);
      }
    }

    // Verificar autenticación
    console.log('\n🔐 Verificando autenticación...');
    const authButton = page.locator('button:has-text("Iniciar sesión"), a:has-text("Login")').first();
    const isAuthenticated = (await authButton.count()) === 0;

    if (!isAuthenticated) {
      console.log('⚠️  Usuario no autenticado. Esto puede causar el error "Booking no encontrado"');
      console.log('   La vista `my_bookings` requiere autenticación.\n');
    } else {
      console.log('✅ Usuario autenticado\n');
    }

    // Buscar el componente del SDK
    console.log('🔎 Buscando componente MercadoPago CardForm...');
    const cardFormComponent = page.locator('app-mercadopago-card-form');
    const cardFormExists = await cardFormComponent.count() > 0;

    if (cardFormExists) {
      console.log('✅ Componente CardForm encontrado!\n');

      // Extraer selectores visibles
      const selectors = {
        component: 'app-mercadopago-card-form',
        container: '.mp-card-form-container',
        form: 'form#form-checkout',
        fields: {},
        submitButton: null,
      };

      // Verificar cada campo
      const fields = [
        { id: 'cardNumber', selector: '#form-checkout__cardNumber', name: 'Número de Tarjeta' },
        { id: 'expirationDate', selector: '#form-checkout__expirationDate', name: 'Vencimiento' },
        { id: 'securityCode', selector: '#form-checkout__securityCode', name: 'CVV' },
        { id: 'cardholderName', selector: '#form-checkout__cardholderName', name: 'Titular' },
        { id: 'identificationType', selector: '#form-checkout__identificationType', name: 'Tipo Doc' },
        { id: 'identificationNumber', selector: '#form-checkout__identificationNumber', name: 'Número Doc' },
      ];

      console.log('📋 Selectores encontrados:');
      for (const field of fields) {
        const exists = await page.locator(field.selector).count() > 0;
        const status = exists ? '✅' : '❌';
        console.log(`   ${status} ${field.name.padEnd(15)}: ${field.selector}`);
        selectors.fields[field.id] = {
          selector: field.selector,
          exists,
          name: field.name,
        };
      }

      // Botón de envío
      const submitButton = page.locator('form#form-checkout button[type="submit"]');
      const submitExists = await submitButton.count() > 0;
      if (submitExists) {
        const submitText = await submitButton.textContent();
        selectors.submitButton = {
          selector: 'form#form-checkout button[type="submit"]',
          text: submitText?.trim(),
        };
        console.log(`   ✅ Botón Envío: ${selectors.submitButton.selector} (${selectors.submitButton.text})`);
      }

      // Guardar selectores
      const outputFile = 'tmp/mercadopago-selectors-live.json';
      fs.mkdirSync('tmp', { recursive: true });
      fs.writeFileSync(
        outputFile,
        JSON.stringify(selectors, null, 2),
        'utf-8'
      );

      console.log(`\n💾 Selectores guardados en: ${outputFile}`);

      // Tomar screenshot
      const screenshotPath = 'tmp/mercadopago-cardform-screenshot.png';
      await cardFormComponent.screenshot({ path: screenshotPath });
      console.log(`📸 Screenshot guardado en: ${screenshotPath}`);

    } else {
      console.log('⚠️  Componente CardForm no encontrado en la página actual\n');
      console.log('💡 Para ver el SDK, necesitas:');
      console.log('   1. Estar autenticado');
      console.log('   2. Tener un booking en estado "pending"');
      console.log('   3. Navegar a: /bookings/:bookingId/checkout');
      console.log('   4. Hacer click en "Pagar con MercadoPago"\n');

      // Mostrar URL actual
      const currentUrl = page.url();
      console.log(`📍 URL actual: ${currentUrl}`);

      // Verificar si hay bookings en la página
      const bookingsLink = page.locator('a[href*="/bookings/"]').first();
      if (await bookingsLink.count() > 0) {
        const href = await bookingsLink.getAttribute('href');
        console.log(`\n💡 Enlace a bookings encontrado: ${href}`);
      }
    }

    // Mostrar información de debugging
    console.log('\n📊 Información de debugging:');
    console.log(`   URL: ${page.url()}`);
    console.log(`   Título: ${await page.title()}`);

    // Verificar errores en consola
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Esperar un momento para capturar errores
    await page.waitForTimeout(2000);

    if (consoleErrors.length > 0) {
      console.log('\n⚠️  Errores en consola del navegador:');
      consoleErrors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }

    console.log('\n✅ Diagnóstico completado!\n');
    console.log('💡 El navegador permanecerá abierto para inspección manual.');
    console.log('   Presiona Ctrl+C para cerrar.\n');

    // Mantener abierto
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (browser && !CHROME_WS) {
      await browser.close();
    }
  }
}

debugCheckout().catch(console.error);



