/**
 * Stagehand E2E Test - Publicar Auto en AUTORENTA
 *
 * Test completo del flujo de publicación paso a paso:
 * Login → Marca → Año → Modelo → Fotos → Kilometraje → Precio → Ubicación → Resumen
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';

// Validar credenciales
if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
  console.error('❌ ERROR: Configura TEST_USER_EMAIL y TEST_USER_PASSWORD en .env');
  process.exit(1);
}

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.GEMINI_API_KEY) {
  console.error('❌ ERROR: Falta GEMINI_API_KEY en .env');
  process.exit(1);
}

const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:4200',
  testUser: {
    email: process.env.TEST_USER_EMAIL,
    password: process.env.TEST_USER_PASSWORD,
  },
  testCar: {
    brand: 'Toyota',
    year: '2022',
    model: 'Corolla',
    mileage: '25000',
    pricePerDay: '50',
    location: 'Buenos Aires',
  },
  screenshotDir: '/home/edu/autorenta/tools/stagehand-poc/screenshots',
  logsDir: '/home/edu/autorenta/tools/stagehand-poc/logs',
};

interface TestResult {
  step: string;
  success: boolean;
  duration: number;
  error?: string;
}

interface ConsoleLog {
  timestamp: string;
  type: string;
  text: string;
  location?: string;
}

const results: TestResult[] = [];
const consoleLogs: ConsoleLog[] = [];
const networkErrors: string[] = [];

async function logStep(step: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  console.log(`\n🔄 ${step}...`);

  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ step, success: true, duration });
    console.log(`   ✅ Completado en ${(duration / 1000).toFixed(1)}s`);
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ step, success: false, duration, error: errorMsg });
    console.log(`   ❌ Error: ${errorMsg}`);
    throw error;
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🚗 STAGEHAND E2E TEST: Publicar Auto en AUTORENTA');
  console.log('═'.repeat(60));
  console.log(`\n📍 URL: ${CONFIG.baseUrl}`);
  console.log(`👤 Usuario: ${CONFIG.testUser.email}`);
  console.log(`🚙 Auto: ${CONFIG.testCar.brand} ${CONFIG.testCar.model} ${CONFIG.testCar.year}`);

  // Crear directorios
  const fs = await import('fs');
  if (!fs.existsSync(CONFIG.screenshotDir)) {
    fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
  }
  if (!fs.existsSync(CONFIG.logsDir)) {
    fs.mkdirSync(CONFIG.logsDir, { recursive: true });
  }

  const stagehand = new Stagehand({
    env: 'LOCAL',
    model: 'google/gemini-2.5-flash',
    headless: false,
    verbose: 1,
  });

  try {
    await logStep('Inicializando Stagehand', async () => {
      await stagehand.init();
    });

    const page = stagehand.context.pages()[0];

    // ========== CAPTURAR CONSOLE LOGS ==========
    // Nota: Stagehand solo soporta el evento 'console'
    page.on('console', (msg) => {
      const log: ConsoleLog = {
        timestamp: new Date().toISOString(),
        type: msg.type(),
        text: msg.text(),
        location: msg.location()?.url,
      };
      consoleLogs.push(log);

      // Mostrar errores y warnings en tiempo real
      if (msg.type() === 'error') {
        console.log(`   🔴 Console Error: ${msg.text().slice(0, 100)}`);
      } else if (msg.type() === 'warning') {
        console.log(`   ⚠️  Console Warn: ${msg.text().slice(0, 80)}`);
      }
    });

    // Helper para screenshots
    const screenshot = async (name: string) => {
      await page.screenshot({ path: `${CONFIG.screenshotDir}/${name}.png` });
      console.log(`   📸 Screenshot: ${name}.png`);
    };

    // Helper para guardar logs
    const saveLogs = async () => {
      const fs = await import('fs');
      const logsPath = `${CONFIG.logsDir}/console-logs.json`;
      const errorsPath = `${CONFIG.logsDir}/network-errors.json`;

      fs.writeFileSync(logsPath, JSON.stringify(consoleLogs, null, 2));
      fs.writeFileSync(errorsPath, JSON.stringify(networkErrors, null, 2));

      // Filtrar solo errores para reporte
      const errors = consoleLogs.filter(l => l.type === 'error' || l.type === 'pageerror');
      if (errors.length > 0) {
        console.log(`\n⚠️  Se encontraron ${errors.length} errores en consola:`);
        errors.slice(0, 5).forEach(e => {
          console.log(`   - [${e.type}] ${e.text.slice(0, 80)}...`);
        });
      }
    };

    // ========== LOGIN ==========
    await logStep('Haciendo login', async () => {
      console.log('   → Navegando a login...');
      await page.goto(`${CONFIG.baseUrl}/auth/login`, { waitUntil: 'networkidle' });

      // Esperar a que Angular renderice (app es client-side rendered)
      console.log('   → Esperando que Angular renderice...');
      await page.waitForTimeout(8000);

      // Diagnosticar si la página cargó
      const bodyContent = await page.evaluate(() => {
        const appRoot = document.querySelector('app-root');
        // Capturar errores de window
        const errors: string[] = [];
        // @ts-ignore
        if (window.__pageErrors) {
          // @ts-ignore
          errors.push(...window.__pageErrors);
        }
        return {
          hasAppRoot: !!appRoot,
          appRootHTML: appRoot?.innerHTML?.slice(0, 500) || 'empty',
          bodyChildren: document.body.children.length,
          url: window.location.href,
          errors,
          // Check if Angular loaded
          hasNgVersion: !!(window as any).ng,
          // Check if there's a loading spinner
          hasSpinner: !!document.querySelector('.loading, .spinner, [class*="load"]'),
        };
      });
      console.log('   → Diagnóstico de página:', JSON.stringify(bodyContent, null, 2));

      // Si app-root está vacío, esperar más
      if (bodyContent.appRootHTML === 'empty') {
        console.log('   ⚠️ Angular no renderizó, esperando más...');
        await page.waitForTimeout(10000);

        // Re-check
        const recheck = await page.evaluate(() => {
          const appRoot = document.querySelector('app-root');
          return appRoot?.innerHTML?.slice(0, 200) || 'still empty';
        });
        console.log('   → Re-check después de 10s:', recheck.slice(0, 100));
      }

      await screenshot('01-login-page');

      // Click en botón principal Ingresar
      console.log('   → Click en Ingresar...');
      await stagehand.act('click the green "Ingresar" button');
      await page.waitForTimeout(2000);
      await screenshot('02-login-options');

      // Click en login con email
      console.log('   → Click en login con email...');
      await stagehand.act('click on "o con email" or the email login option');
      await page.waitForTimeout(2000);
      await screenshot('03-login-form');

      // Llenar credenciales
      console.log('   → Ingresando credenciales...');
      await stagehand.act(`type "${CONFIG.testUser.email}" in the email input field`);
      await page.waitForTimeout(500);
      await stagehand.act(`type "${CONFIG.testUser.password}" in the password input field`);
      await page.waitForTimeout(500);
      await screenshot('04-credentials-filled');

      // Submit
      console.log('   → Enviando login...');
      await stagehand.act('click the "Ingresar" submit button');
      await page.waitForTimeout(5000);
      await screenshot('05-post-login');

      // Verificar login exitoso
      const url = page.url();
      if (url.includes('/auth/login')) {
        throw new Error('Login falló - aún en página de login');
      }
      console.log(`   → Login exitoso! URL: ${url}`);
    });

    // ========== NAVEGAR A PUBLICAR ==========
    await logStep('Navegando a publicar auto', async () => {
      await page.goto(`${CONFIG.baseUrl}/cars/publish`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      await screenshot('06-publish-start');
    });

    // ========== PASO 1: MARCA ==========
    await logStep('Paso 1: Seleccionar marca', async () => {
      await screenshot('07-brand-step');

      // Buscar Toyota en el campo de búsqueda
      console.log(`   → Buscando ${CONFIG.testCar.brand}...`);
      await stagehand.act(`type "${CONFIG.testCar.brand}" in the brand search input field`);
      await page.waitForTimeout(1500);
      await screenshot('08-brand-search');

      // Seleccionar Toyota de la lista
      console.log(`   → Seleccionando ${CONFIG.testCar.brand}...`);
      await stagehand.act(`click on the "${CONFIG.testCar.brand}" button or option in the brand list`);
      await page.waitForTimeout(1000);
      await screenshot('09-brand-selected');

      // Click en Continuar
      console.log('   → Click en Continuar...');
      await stagehand.act('click the "Continuar" button to go to the next step');
      await page.waitForTimeout(2000);
      await screenshot('10-after-brand');
    });

    // ========== PASO 2: AÑO ==========
    await logStep('Paso 2: Seleccionar año', async () => {
      await screenshot('11-year-step');

      // Seleccionar el año
      console.log(`   → Seleccionando año ${CONFIG.testCar.year}...`);
      await stagehand.act(`click on the year "${CONFIG.testCar.year}" button or select ${CONFIG.testCar.year} from the year options`);
      await page.waitForTimeout(1000);
      await screenshot('12-year-selected');

      // Click en Continuar
      console.log('   → Click en Continuar...');
      await stagehand.act('click the "Continuar" button');
      await page.waitForTimeout(2000);
      await screenshot('13-after-year');
    });

    // ========== PASO 3: MODELO ==========
    await logStep('Paso 3: Seleccionar modelo', async () => {
      await screenshot('14-model-step');

      // Buscar modelo
      console.log(`   → Buscando modelo ${CONFIG.testCar.model}...`);
      await stagehand.act(`type "${CONFIG.testCar.model}" in the model search input field`);
      await page.waitForTimeout(1500);
      await screenshot('15-model-search');

      // Seleccionar modelo
      console.log(`   → Seleccionando ${CONFIG.testCar.model}...`);
      await stagehand.act(`click on "${CONFIG.testCar.model}" in the model list or dropdown`);
      await page.waitForTimeout(1000);
      await screenshot('16-model-selected');

      // Click en Continuar
      console.log('   → Click en Continuar...');
      await stagehand.act('click the "Continuar" button');
      await page.waitForTimeout(2000);
      await screenshot('17-after-model');
    });

    // ========== PASO 4: FOTOS (Generar con IA) ==========
    await logStep('Paso 4: Generar fotos con IA', async () => {
      await screenshot('18-photos-step');

      // Click en GENERAR para crear fotos con IA
      console.log('   → Haciendo click en GENERAR fotos con IA...');
      await stagehand.act('click the "GENERAR" button or "generar fotos con IA" link to generate AI photos');
      await page.waitForTimeout(5000); // Esperar a que se generen las fotos
      await screenshot('19-generating-photos');

      // Esperar a que las fotos se generen
      console.log('   → Esperando generación de fotos...');
      await page.waitForTimeout(10000); // Las fotos AI pueden tardar
      await screenshot('20-photos-generated');

      // Click en Continuar
      console.log('   → Click en Continuar...');
      await stagehand.act('click the "Continuar" button');
      await page.waitForTimeout(2000);
      await screenshot('21-after-photos');
    });

    // ========== PASO 5: KILOMETRAJE ==========
    await logStep('Paso 5: Ingresar kilometraje', async () => {
      await screenshot('22-mileage-step');

      // Ingresar kilometraje
      console.log(`   → Ingresando kilometraje: ${CONFIG.testCar.mileage}...`);
      await stagehand.act(`type "${CONFIG.testCar.mileage}" in the mileage or kilometers input field`);
      await page.waitForTimeout(1000);
      await screenshot('23-mileage-entered');

      // Click en Continuar
      console.log('   → Click en Continuar...');
      await stagehand.act('click the "Continuar" button');
      await page.waitForTimeout(2000);
      await screenshot('24-after-mileage');
    });

    // ========== PASO 6: PRECIO ==========
    await logStep('Paso 6: Establecer precio', async () => {
      await screenshot('25-price-step');

      // Ingresar precio
      console.log(`   → Ingresando precio: $${CONFIG.testCar.pricePerDay}/día...`);
      await stagehand.act(`type "${CONFIG.testCar.pricePerDay}" in the price per day input field`);
      await page.waitForTimeout(1000);
      await screenshot('26-price-entered');

      // Click en Continuar
      console.log('   → Click en Continuar...');
      await stagehand.act('click the "Continuar" button');
      await page.waitForTimeout(2000);
      await screenshot('27-after-price');
    });

    // ========== PASO 7: UBICACIÓN ==========
    await logStep('Paso 7: Establecer ubicación', async () => {
      await screenshot('28-location-step');

      // Buscar ubicación
      console.log(`   → Buscando ubicación: ${CONFIG.testCar.location}...`);
      await stagehand.act(`type "${CONFIG.testCar.location}" in the location search input field`);
      await page.waitForTimeout(2000);
      await screenshot('29-location-search');

      // Seleccionar de la lista
      console.log('   → Seleccionando ubicación de la lista...');
      await stagehand.act(`click on "${CONFIG.testCar.location}" in the location suggestions or dropdown`);
      await page.waitForTimeout(1000);
      await screenshot('30-location-selected');

      // Click en Continuar
      console.log('   → Click en Continuar...');
      await stagehand.act('click the "Continuar" button');
      await page.waitForTimeout(2000);
      await screenshot('31-after-location');
    });

    // ========== PASO 8: RESUMEN ==========
    await logStep('Paso 8: Verificar resumen', async () => {
      await screenshot('32-summary');

      // Extraer datos del resumen
      const SummarySchema = z.object({
        brand: z.string().describe('La marca del vehículo'),
        model: z.string().describe('El modelo del vehículo'),
        year: z.string().describe('El año del vehículo'),
        price: z.string().describe('El precio por día'),
      });

      const summary = await stagehand.extract(
        'Extract the car details from the summary page: brand, model, year, and daily price',
        SummarySchema
      );

      console.log(`   → Resumen extraído:`);
      console.log(`     Marca: ${summary.brand}`);
      console.log(`     Modelo: ${summary.model}`);
      console.log(`     Año: ${summary.year}`);
      console.log(`     Precio: ${summary.price}`);
    });

    // Guardar logs capturados
    await saveLogs();

    // ========== RESUMEN FINAL ==========
    console.log('\n' + '═'.repeat(60));
    console.log('📊 RESUMEN DEL TEST');
    console.log('═'.repeat(60));

    const totalTime = results.reduce((acc, r) => acc + r.duration, 0);
    const successCount = results.filter(r => r.success).length;

    console.log(`\n✅ Pasos exitosos: ${successCount}/${results.length}`);
    console.log(`⏱️  Tiempo total: ${(totalTime / 1000).toFixed(1)} segundos`);

    console.log('\n📋 Detalle por paso:');
    results.forEach((r, i) => {
      const status = r.success ? '✅' : '❌';
      console.log(`   ${i + 1}. ${status} ${r.step}: ${(r.duration / 1000).toFixed(1)}s`);
      if (r.error) {
        console.log(`      Error: ${r.error}`);
      }
    });

    console.log(`\n📸 Screenshots guardados en: ${CONFIG.screenshotDir}`);

  } catch (error) {
    console.error('\n💥 Test falló:', error);

    // Guardar logs incluso si falló
    const fs = await import('fs');
    fs.writeFileSync(`${CONFIG.logsDir}/console-logs.json`, JSON.stringify(consoleLogs, null, 2));
    fs.writeFileSync(`${CONFIG.logsDir}/network-errors.json`, JSON.stringify(networkErrors, null, 2));

    // Mostrar errores de consola relevantes
    const errors = consoleLogs.filter(l => l.type === 'error' || l.type === 'pageerror');
    if (errors.length > 0) {
      console.log(`\n⚠️  Errores de consola capturados (${errors.length}):`);
      errors.slice(0, 10).forEach(e => {
        console.log(`   - [${e.type}] ${e.text.slice(0, 100)}`);
      });
    }
  } finally {
    console.log('\n🔚 Cerrando navegador...');
    await stagehand.close();
  }
}

main().catch(console.error);
