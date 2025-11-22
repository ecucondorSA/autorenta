#!/usr/bin/env node

/**
 * Script para extraer selectores del SDK de MercadoPago en vivo
 * Navega a la página donde está el CardForm visible y extrae todos los selectores
 */

import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200';
const CHROME_WS = process.env.CHROME_CDP_WS_ENDPOINT || process.env.CDP_WS;

async function extractSelectors() {
  console.log('🔍 Extrayendo selectores del SDK de MercadoPago en vivo...\n');

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

    // Buscar el componente CardForm
    console.log('\n🔎 Buscando componente MercadoPago CardForm...');

    // Esperar a que aparezca el componente (puede estar en diferentes rutas)
    const cardFormSelector = 'app-mercadopago-card-form';
    await page.waitForSelector(cardFormSelector, { timeout: 10000 }).catch(() => {
      console.log('⚠️  Componente no encontrado en la página principal');
      console.log('💡 Buscando en otras rutas...');
    });

    // Verificar si el componente existe
    const cardFormExists = await page.locator(cardFormSelector).count() > 0;

    if (!cardFormExists) {
      console.log('\n⚠️  Componente CardForm no encontrado en la página actual');
      console.log('\n💡 Para ver el SDK, necesitas:');
      console.log('   1. Estar autenticado');
      console.log('   2. Tener un booking en estado "pending"');
      console.log('   3. Navegar a: /bookings/:bookingId/checkout');
      console.log('   4. Hacer click en "Pagar con MercadoPago"');
      console.log('\n📍 URL actual:', page.url());

      // Buscar enlaces a bookings
      const bookingsLinks = await page.locator('a[href*="/bookings/"]').all();
      if (bookingsLinks.length > 0) {
        console.log(`\n💡 Encontrados ${bookingsLinks.length} enlaces a bookings`);
        for (let i = 0; i < Math.min(bookingsLinks.length, 3); i++) {
          const href = await bookingsLinks[i].getAttribute('href');
          console.log(`   ${i + 1}. ${href}`);
        }
      }

      return;
    }

    console.log('✅ Componente CardForm encontrado!\n');

    // Extraer selectores
    const selectors = {
      component: {
        selector: 'app-mercadopago-card-form',
        exists: true,
        description: 'Componente Angular del formulario de tarjeta',
      },
      container: {
        selector: '.mp-card-form-container',
        exists: await page.locator('.mp-card-form-container').count() > 0,
        description: 'Contenedor principal del formulario',
      },
      form: {
        selector: 'form#form-checkout',
        exists: await page.locator('form#form-checkout').count() > 0,
        description: 'Formulario principal',
      },
      fields: {},
      submitButton: null,
      title: null,
      messages: {},
    };

    // Campos del formulario
    const fields = [
      { id: 'cardNumber', selector: '#form-checkout__cardNumber', name: 'Número de Tarjeta', type: 'iframe' },
      { id: 'expirationDate', selector: '#form-checkout__expirationDate', name: 'Vencimiento', type: 'iframe' },
      { id: 'securityCode', selector: '#form-checkout__securityCode', name: 'CVV', type: 'iframe' },
      { id: 'cardholderName', selector: '#form-checkout__cardholderName', name: 'Titular de la Tarjeta', type: 'input' },
      { id: 'identificationType', selector: '#form-checkout__identificationType', name: 'Tipo de Documento', type: 'select' },
      { id: 'identificationNumber', selector: '#form-checkout__identificationNumber', name: 'Número de Documento', type: 'input' },
    ];

    console.log('📋 Verificando selectores:\n');
    for (const field of fields) {
      const exists = await page.locator(field.selector).count() > 0;
      const status = exists ? '✅' : '❌';
      console.log(`   ${status} ${field.name.padEnd(20)}: ${field.selector}`);

      // Obtener más información del campo
      let placeholder = null;
      let value = null;
      let options = null;

      if (exists) {
        try {
          if (field.type === 'input') {
            placeholder = await page.locator(field.selector).getAttribute('placeholder');
            value = await page.locator(field.selector).inputValue().catch(() => null);
          } else if (field.type === 'select') {
            options = await page.locator(field.selector + ' option').allTextContents();
          }
        } catch (e) {
          // Ignorar errores al obtener atributos
        }
      }

      selectors.fields[field.id] = {
        selector: field.selector,
        exists,
        name: field.name,
        type: field.type,
        placeholder,
        value,
        options: options && options.length > 0 ? options : undefined,
      };
    }

    // Botón de envío
    const submitButton = page.locator('form#form-checkout button[type="submit"]');
    const submitExists = await submitButton.count() > 0;
    if (submitExists) {
      const submitText = await submitButton.textContent();
      const isDisabled = await submitButton.isDisabled();
      selectors.submitButton = {
        selector: 'form#form-checkout button[type="submit"]',
        exists: true,
        text: submitText?.trim(),
        disabled: isDisabled,
      };
      console.log(`\n   ✅ Botón Envío: ${selectors.submitButton.selector}`);
      console.log(`      Texto: "${selectors.submitButton.text}"`);
      console.log(`      Estado: ${isDisabled ? 'Deshabilitado' : 'Habilitado'}`);
    }

    // Título
    const title = page.locator('h3:has-text("Información de Pago")');
    if (await title.count() > 0) {
      const titleText = await title.textContent();
      selectors.title = {
        selector: 'h3:has-text("Información de Pago")',
        text: titleText?.trim(),
      };
    }

    // Mensajes
    const securityMessage = page.locator('p:has-text("Tus datos están protegidos")');
    if (await securityMessage.count() > 0) {
      const messageText = await securityMessage.textContent();
      selectors.messages.security = {
        selector: 'p:has-text("Tus datos están protegidos")',
        text: messageText?.trim(),
      };
    }

    // Labels
    selectors.labels = {};
    const labelTexts = [
      'Número de Tarjeta',
      'Vencimiento',
      'CVV',
      'Titular de la Tarjeta',
      'Tipo de Documento',
      'Número de Documento',
    ];

    for (const labelText of labelTexts) {
      const label = page.locator(`label:has-text("${labelText}")`);
      if (await label.count() > 0) {
        selectors.labels[labelText] = {
          selector: `label:has-text("${labelText}")`,
          exists: true,
        };
      }
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

    // Generar código de ejemplo para Playwright
    const playwrightExample = `// Ejemplo de uso de selectores en Playwright
import { test, expect } from '@playwright/test';

test('MercadoPago CardForm - Selectores extraídos', async ({ page }) => {
  // Navegar a checkout
  await page.goto('/bookings/:bookingId/checkout');

  // Esperar a que aparezca el CardForm
  await page.locator('app-mercadopago-card-form').waitFor();

  // Verificar que el formulario esté visible
  await expect(page.locator('form#form-checkout')).toBeVisible();

  // Verificar campos iframe (MercadoPago maneja internamente)
  await expect(page.locator('#form-checkout__cardNumber')).toBeVisible();
  await expect(page.locator('#form-checkout__expirationDate')).toBeVisible();
  await expect(page.locator('#form-checkout__securityCode')).toBeVisible();

  // Campos de texto normales
  await page.fill('#form-checkout__cardholderName', 'NOMBRE APELLIDO');
  await page.selectOption('#form-checkout__identificationType', 'DNI');
  await expect(page.locator('#form-checkout__identificationType')).toHaveValue('DNI');
  await page.fill('#form-checkout__identificationNumber', '12345678');

  // Verificar botón de envío
  const submitButton = page.locator('form#form-checkout button[type="submit"]');
  await expect(submitButton).toBeVisible();
  await expect(submitButton).toContainText('Autorizar Tarjeta');

  // Verificar mensaje de seguridad
  await expect(page.locator('p:has-text("Tus datos están protegidos")')).toBeVisible();
});
`.trim();

    const exampleFile = 'tmp/mercadopago-selectors-playwright-example.ts';
    fs.writeFileSync(exampleFile, playwrightExample, 'utf-8');
    console.log(`📝 Ejemplo de código Playwright guardado en: ${exampleFile}`);

    // Tomar screenshot
    const screenshotPath = 'tmp/mercadopago-cardform-screenshot.png';
    await page.locator('.mp-card-form-container').screenshot({ path: screenshotPath });
    console.log(`📸 Screenshot guardado en: ${screenshotPath}`);

    // Mostrar resumen
    console.log('\n' + '═'.repeat(60));
    console.log('📊 RESUMEN DE SELECTORES');
    console.log('═'.repeat(60));
    console.log(`Componente: ${selectors.component.selector} ${selectors.component.exists ? '✅' : '❌'}`);
    console.log(`Contenedor: ${selectors.container.selector} ${selectors.container.exists ? '✅' : '❌'}`);
    console.log(`Formulario: ${selectors.form.selector} ${selectors.form.exists ? '✅' : '❌'}`);
    console.log(`\nCampos encontrados: ${Object.values(selectors.fields).filter(f => f.exists).length}/${fields.length}`);
    console.log(`Botón envío: ${selectors.submitButton ? '✅' : '❌'}`);
    console.log(`Título: ${selectors.title ? '✅' : '❌'}`);
    console.log(`Mensaje seguridad: ${selectors.messages.security ? '✅' : '❌'}`);
    console.log('═'.repeat(60));

    console.log('\n✅ Extracción completada!\n');
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

extractSelectors().catch(console.error);











