#!/usr/bin/env node

/**
 * Script de Debugging Automatizado - MercadoPago SDK
 *
 * Analiza exhaustivamente por qué el CardForm no se muestra o no funciona
 *
 * Uso:
 *   npm run dev (en otra terminal)
 *   node scripts/debug-mercadopago-sdk.mjs
 *
 * O con parámetros:
 *   BASE_URL=http://localhost:4200 node scripts/debug-mercadopago-sdk.mjs
 */

import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';
const CHROME_WS = process.env.CHROME_CDP_WS_ENDPOINT || process.env.CDP_WS;

// Colores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(color, emoji, message) {
  console.log(`${colors[color]}${emoji} ${message}${colors.reset}`);
}

function section(title) {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  ${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

async function debugMercadoPagoSDK() {
  section('🔍 DEBUGGING MERCADOPAGO SDK');

  log('blue', '🚀', `Conectando a: ${BASE_URL}`);

  let browser;
  let report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    checks: {},
    errors: [],
    warnings: [],
    recommendations: [],
  };

  try {
    // Conectar a Chrome
    if (CHROME_WS) {
      log('blue', '📡', `Conectando a Chrome via CDP: ${CHROME_WS}`);
      browser = await chromium.connectOverCDP(CHROME_WS);
    } else {
      log('blue', '🌐', 'Iniciando nuevo navegador...');
      browser = await chromium.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled']
      });
    }

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    // Capturar errores de console
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navegar a la página principal
    section('📄 PASO 1: NAVEGACIÓN');
    log('blue', '⏳', 'Navegando a la página principal...');

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    log('green', '✅', `Cargado: ${page.url()}`);

    // Buscar un booking existente o crear URL de prueba
    section('🔎 PASO 2: BUSCAR PÁGINA DE PAYMENT');

    const bookingLinks = await page.locator('a[href*="/bookings/"]').all();
    let paymentUrl = null;

    if (bookingLinks.length > 0) {
      log('yellow', '💡', `Encontrados ${bookingLinks.length} enlaces a bookings`);

      // Intentar encontrar un enlace directo a payment
      for (const link of bookingLinks.slice(0, 5)) {
        const href = await link.getAttribute('href');
        if (href && href.includes('payment')) {
          paymentUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
          log('green', '✅', `Encontrada página de payment: ${href}`);
          break;
        }
      }
    }

    // Si no hay URL de payment, construir una de prueba
    if (!paymentUrl) {
      log('yellow', '⚠️', 'No se encontró URL de payment, usando URL de prueba...');
      paymentUrl = `${BASE_URL}/bookings/payment?carId=test-car&startDate=2025-01-01T10:00:00Z&endDate=2025-01-05T10:00:00Z`;
      report.warnings.push('URL de prueba generada - puede no funcionar si requiere autenticación');
    }

    // Navegar a la página de payment
    log('blue', '⏳', `Navegando a: ${paymentUrl}`);
    await page.goto(paymentUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000); // Esperar a que Angular renderice

    // PASO 3: Verificar componente booking-detail-payment
    section('🎯 PASO 3: VERIFICAR COMPONENTE PRINCIPAL');

    const mainComponent = await page.locator('app-booking-detail-payment').count();
    report.checks.mainComponentExists = mainComponent > 0;

    if (mainComponent > 0) {
      log('green', '✅', 'Componente app-booking-detail-payment encontrado');
    } else {
      log('red', '❌', 'Componente app-booking-detail-payment NO encontrado');
      report.errors.push('Componente principal no existe en el DOM');
      report.recommendations.push('Verificar que la ruta esté correcta y el componente se esté cargando');
    }

    // PASO 4: Verificar estados de Angular (signals)
    section('🔧 PASO 4: ESTADOS DE ANGULAR SIGNALS');

    const componentStates = await page.evaluate(() => {
      try {
        const element = document.querySelector('app-booking-detail-payment');
        if (!element) return { error: 'Component not found in DOM' };

        const comp = window.ng?.getComponent?.(element);
        if (!comp) return { error: 'ng.getComponent not available' };

        return {
          bookingCreated: comp.bookingCreated?.() ?? null,
          loading: comp.loading?.() ?? null,
          error: comp.error?.() ?? null,
          paymentProcessing: comp.paymentProcessing?.() ?? null,
          car: comp.car?.() !== null,
          fxSnapshot: comp.fxSnapshot?.() !== null,
          totalArs: comp.totalArs?.() ?? null,
          shouldShowCardForm: !comp.bookingCreated?.() && !comp.loading?.() && !comp.error?.(),
        };
      } catch (err) {
        return { error: err.message };
      }
    });

    report.checks.componentStates = componentStates;

    if (componentStates.error) {
      log('red', '❌', `Error obteniendo estados: ${componentStates.error}`);
      report.errors.push(`No se pudieron obtener estados del componente: ${componentStates.error}`);
    } else {
      log('blue', '📊', 'Estados del componente:');
      console.log(JSON.stringify(componentStates, null, 2));

      // Análisis de estados
      if (componentStates.loading) {
        log('yellow', '⚠️', 'loading = true → El componente está en estado de carga');
        report.warnings.push('Componente en estado de carga');
      }

      if (componentStates.error) {
        log('red', '❌', `error = "${componentStates.error}" → Hay un error activo`);
        report.errors.push(`Error activo en componente: ${componentStates.error}`);
      }

      if (componentStates.bookingCreated) {
        log('yellow', '⚠️', 'bookingCreated = true → El booking ya fue creado');
        report.warnings.push('Booking ya creado - CardForm no se mostrará');
        report.recommendations.push('La lógica actual oculta el CardForm cuando bookingCreated = true');
      }

      if (!componentStates.car) {
        log('red', '❌', 'car = null → No hay información del auto');
        report.errors.push('Datos del auto no cargados');
      }

      if (!componentStates.fxSnapshot) {
        log('red', '❌', 'fxSnapshot = null → No hay tasas de cambio');
        report.errors.push('Tasas de cambio no cargadas');
      }

      if (componentStates.shouldShowCardForm) {
        log('green', '✅', 'shouldShowCardForm = true → CardForm DEBERÍA mostrarse');
      } else {
        log('red', '❌', 'shouldShowCardForm = false → CardForm NO se mostrará');
        report.errors.push('Condiciones no cumplen para mostrar CardForm');
      }
    }

    // PASO 5: Verificar existencia de CardForm en DOM
    section('💳 PASO 5: VERIFICAR MERCADOPAGO CARDFORM');

    const cardFormCount = await page.locator('app-mercadopago-card-form').count();
    report.checks.cardFormExists = cardFormCount > 0;

    if (cardFormCount > 0) {
      log('green', '✅', `CardForm encontrado (${cardFormCount} instancia(s))`);
    } else {
      log('red', '❌', 'CardForm NO encontrado en el DOM');
      report.errors.push('app-mercadopago-card-form no existe en el DOM');
      report.recommendations.push('Verificar condición @if en booking-detail-payment.page.html:341');
    }

    // PASO 6: Verificar carga del SDK
    section('📦 PASO 6: VERIFICAR SDK DE MERCADOPAGO');

    const sdkLoaded = await page.evaluate(() => {
      return {
        MercadoPago: typeof window.MercadoPago !== 'undefined',
        Mercadopago: typeof window.Mercadopago !== 'undefined',
        sdkScript: !!document.querySelector('script[src*="sdk.mercadopago.com"]'),
      };
    });

    report.checks.sdkLoaded = sdkLoaded;

    if (sdkLoaded.MercadoPago || sdkLoaded.Mercadopago) {
      log('green', '✅', 'SDK de MercadoPago cargado globalmente');
    } else {
      log('red', '❌', 'SDK de MercadoPago NO está en window');
      report.errors.push('window.MercadoPago no está definido');
    }

    if (sdkLoaded.sdkScript) {
      log('green', '✅', 'Script del SDK encontrado en DOM');
    } else {
      log('yellow', '⚠️', 'Script del SDK NO encontrado (puede cargarse dinámicamente)');
    }

    // PASO 7: Verificar iframes del SDK
    section('🖼️ PASO 7: VERIFICAR IFRAMES DEL SDK');

    const iframes = await page.evaluate(() => {
      const allIframes = Array.from(document.querySelectorAll('iframe'));
      return allIframes.map(iframe => ({
        src: iframe.src,
        id: iframe.id,
        isMercadoPago: iframe.src.includes('mercadopago') || iframe.src.includes('mercadolibre'),
      }));
    });

    report.checks.iframes = iframes;

    const mpIframes = iframes.filter(i => i.isMercadoPago);
    if (mpIframes.length > 0) {
      log('green', '✅', `Encontrados ${mpIframes.length} iframes de MercadoPago`);
      mpIframes.forEach((iframe, idx) => {
        log('blue', '  🔗', `iframe ${idx + 1}: ${iframe.src.substring(0, 60)}...`);
      });
    } else {
      log('yellow', '⚠️', 'No se encontraron iframes de MercadoPago');
      report.warnings.push('No hay iframes del SDK - CardForm puede no estar inicializado');
    }

    // PASO 8: Verificar errores de console
    section('🐛 PASO 8: ERRORES DE CONSOLE');

    report.checks.consoleErrors = consoleErrors;

    if (consoleErrors.length > 0) {
      log('red', '❌', `Encontrados ${consoleErrors.length} errores en console:`);
      consoleErrors.slice(0, 10).forEach((err, idx) => {
        log('red', '  ⚠️', `${idx + 1}. ${err.substring(0, 100)}`);
      });

      // Analizar errores comunes
      const cspErrors = consoleErrors.filter(e =>
        e.includes('Content Security Policy') || e.includes('CSP')
      );
      if (cspErrors.length > 0) {
        report.errors.push('Errores de CSP detectados');
        report.recommendations.push('Verificar Content-Security-Policy en _headers o index.html');
      }

      const mpErrors = consoleErrors.filter(e =>
        e.toLowerCase().includes('mercadopago') || e.toLowerCase().includes('mercado pago')
      );
      if (mpErrors.length > 0) {
        report.errors.push('Errores específicos de MercadoPago detectados');
      }
    } else {
      log('green', '✅', 'No hay errores en console');
    }

    // PASO 9: Verificar formulario y campos
    section('📝 PASO 9: VERIFICAR CAMPOS DEL FORMULARIO');

    if (cardFormCount > 0) {
      const formFields = await page.evaluate(() => {
        return {
          form: !!document.querySelector('#form-checkout'),
          cardNumber: !!document.querySelector('#form-checkout__cardNumber'),
          expirationDate: !!document.querySelector('#form-checkout__expirationDate'),
          securityCode: !!document.querySelector('#form-checkout__securityCode'),
          cardholderName: !!document.querySelector('#form-checkout__cardholderName'),
          identificationType: !!document.querySelector('#form-checkout__identificationType'),
          identificationNumber: !!document.querySelector('#form-checkout__identificationNumber'),
        };
      });

      report.checks.formFields = formFields;

      if (formFields.form) {
        log('green', '✅', 'Formulario #form-checkout encontrado');
      } else {
        log('red', '❌', 'Formulario #form-checkout NO encontrado');
      }

      const fieldNames = Object.keys(formFields).filter(k => k !== 'form');
      const foundFields = fieldNames.filter(k => formFields[k]);
      log('blue', '📋', `Campos encontrados: ${foundFields.length}/${fieldNames.length}`);

      fieldNames.forEach(field => {
        if (formFields[field]) {
          log('green', '  ✓', field);
        } else {
          log('red', '  ✗', field);
        }
      });
    }

    // PASO 10: Screenshot
    section('📸 PASO 10: CAPTURA DE PANTALLA');

    const screenshotPath = '/tmp/mercadopago-debug-screenshot.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    log('green', '✅', `Screenshot guardado: ${screenshotPath}`);
    report.screenshot = screenshotPath;

    // GENERAR REPORTE FINAL
    section('📊 REPORTE FINAL');

    // Resumen de checks
    const totalChecks = Object.keys(report.checks).length;
    const passedChecks = Object.values(report.checks).filter(v =>
      v === true || (typeof v === 'object' && v !== null && !v.error)
    ).length;

    log('blue', '📈', `Checks completados: ${passedChecks}/${totalChecks}`);
    log('red', '❌', `Errores: ${report.errors.length}`);
    log('yellow', '⚠️', `Warnings: ${report.warnings.length}`);
    log('blue', '💡', `Recomendaciones: ${report.recommendations.length}`);

    // Mostrar errores
    if (report.errors.length > 0) {
      console.log(`\n${colors.red}${colors.bright}ERRORES:${colors.reset}`);
      report.errors.forEach((err, idx) => {
        log('red', `  ${idx + 1}.`, err);
      });
    }

    // Mostrar warnings
    if (report.warnings.length > 0) {
      console.log(`\n${colors.yellow}${colors.bright}WARNINGS:${colors.reset}`);
      report.warnings.forEach((warn, idx) => {
        log('yellow', `  ${idx + 1}.`, warn);
      });
    }

    // Mostrar recomendaciones
    if (report.recommendations.length > 0) {
      console.log(`\n${colors.cyan}${colors.bright}RECOMENDACIONES:${colors.reset}`);
      report.recommendations.forEach((rec, idx) => {
        log('cyan', `  ${idx + 1}.`, rec);
      });
    }

    // Diagnóstico automático
    section('🎯 DIAGNÓSTICO AUTOMÁTICO');

    if (!report.checks.mainComponentExists) {
      log('red', '🔴', 'PROBLEMA CRÍTICO: Componente principal no existe');
      log('cyan', '💡', 'Solución: Verificar que la ruta esté correcta y el router funcione');
    } else if (!report.checks.cardFormExists) {
      if (componentStates.bookingCreated) {
        log('yellow', '🟡', 'PROBLEMA: bookingCreated = true');
        log('cyan', '💡', 'Solución: Cambiar lógica en booking-detail-payment.page.html:341');
        log('cyan', '💡', 'De: @if (!bookingCreated() && !loading() && !error())');
        log('cyan', '💡', 'A:  @if (!loading() && !error() && car())');
      } else if (componentStates.loading) {
        log('yellow', '🟡', 'PROBLEMA: loading = true');
        log('cyan', '💡', 'Solución: Verificar que loadCarInfo() y loadFxSnapshot() completen');
      } else if (componentStates.error) {
        log('red', '🔴', `PROBLEMA: error = "${componentStates.error}"`);
        log('cyan', '💡', 'Solución: Resolver el error mostrado');
      } else {
        log('red', '🔴', 'PROBLEMA: CardForm no se muestra por razón desconocida');
        log('cyan', '💡', 'Solución: Revisar lógica de renderizado en template');
      }
    } else if (!report.checks.sdkLoaded.MercadoPago) {
      log('red', '🔴', 'PROBLEMA: SDK no cargado');
      log('cyan', '💡', 'Solución: Verificar MercadoPagoScriptService y public key');
    } else if (report.checks.iframes.filter(i => i.isMercadoPago).length === 0) {
      log('yellow', '🟡', 'PROBLEMA: SDK cargado pero sin iframes');
      log('cyan', '💡', 'Solución: Verificar que CardForm.mount() se ejecute');
    } else {
      log('green', '🟢', 'TODO PARECE CORRECTO');
      log('cyan', '💡', 'Si aún no funciona, revisar errores de console específicos');
    }

    // Guardar reporte JSON
    const reportPath = '/tmp/mercadopago-debug-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log('green', '✅', `Reporte JSON guardado: ${reportPath}`);

    // Pausar para inspección manual
    section('⏸️ PAUSADO PARA INSPECCIÓN');
    log('yellow', '👀', 'Navegador abierto para inspección manual');
    log('blue', '💡', 'Presiona Enter para cerrar y terminar...');

    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });

  } catch (error) {
    log('red', '❌', `Error fatal: ${error.message}`);
    console.error(error);
    report.errors.push(`Error fatal: ${error.message}`);
  } finally {
    if (browser && !CHROME_WS) {
      await browser.close();
    }
    log('blue', '👋', 'Debugging completado');
  }

  return report;
}

// Ejecutar
debugMercadoPagoSDK().catch(console.error);
