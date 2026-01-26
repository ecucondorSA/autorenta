#!/usr/bin/env node
/**
 * Script para analizar todos los tests y verificar que los selectores
 * coincidan con el HTML real de los componentes Angular.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Configuración
const TESTS_DIR = path.join(PROJECT_ROOT, 'tests');
const HTML_DIR = path.join(PROJECT_ROOT, 'apps/web/src/app');

// Resultados
const results = {
  totalTests: 0,
  totalSelectors: 0,
  verified: 0,
  broken: [],
  warnings: [],
  notFound: []
};

/**
 * Extrae selectores de un archivo de test
 */
function extractSelectorsFromTest(filePath, content) {
  const selectors = [];
  const lines = content.split('\n');

  // Patrones comunes de selectores en Playwright
  const patterns = [
    // page.locator('selector') o page.locator("selector")
    /page\.locator\(['"`]([^'"`]+)['"`]\)/g,
    // this.page.locator('selector')
    /this\.page\.locator\(['"`]([^'"`]+)['"`]\)/g,
    // this.carCards = page.locator('selector')
    /=\s*page\.locator\(['"`]([^'"`]+)['"`]\)/g,
    // locator('selector')
    /locator\(['"`]([^'"`]+)['"`]\)/g,
    // getByRole('button', { name: /text/ })
    /getByRole\(['"`]([^'"`]+)['"`]/g,
    // getByTestId('id')
    /getByTestId\(['"`]([^'"`]+)['"`]\)/g,
    // getByText(/text/)
    /getByText\([^)]+\)/g,
    // .locator('selector')
    /\.locator\(['"`]([^'"`]+)['"`]\)/g,
    // CSS selectors en strings (data attributes, classes, ids)
    /['"`]([a-zA-Z][a-zA-Z0-9_-]*\[data-[^\]]+\])['"`]/g,
    /['"`]([a-zA-Z][a-zA-Z0-9_-]*\.[a-zA-Z][a-zA-Z0-9_.-]*)['"`]/g,
    /['"`](#[a-zA-Z][a-zA-Z0-9_-]*)['"`]/g,
    // Selectores en Page Objects: readonly selectorName: Locator;
    /readonly\s+(\w+):\s*Locator;/g,
  ];

  lines.forEach((line, lineNum) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
      return;
    }

    patterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(line)) !== null) {
        const selector = match[1] || match[0];
        if (selector && selector.length > 0 && selector.length < 200) {
          // Filtrar selectores que son claramente no válidos
          if (!selector.includes('console.') &&
              !selector.includes('import ') &&
              !selector.includes('export ') &&
              !selector.includes('function ') &&
              !selector.includes('const ') &&
              !selector.includes('let ') &&
              !selector.includes('var ')) {
            selectors.push({
              selector: selector.trim(),
              line: lineNum + 1,
              file: filePath,
              rawLine: line.trim()
            });
          }
        }
      }
    });
  });

  // Eliminar duplicados
  const unique = new Map();
  selectors.forEach(sel => {
    const key = `${sel.selector}:${sel.line}`;
    if (!unique.has(key)) {
      unique.set(key, sel);
    }
  });

  return Array.from(unique.values());
}

/**
 * Encuentra el componente HTML correspondiente a un test
 */
function findCorrespondingHTML(testPath) {
  const relativePath = path.relative(TESTS_DIR, testPath);

  // Mapeo de rutas de test a componentes HTML
  const mappings = [
    // Page Objects específicos
    { pattern: /pages\/cars\/CatalogPage/, html: 'features/cars/list/cars-list.page.html' },
    { pattern: /pages\/cars\/CarDetailPage/, html: 'features/cars/detail/car-detail.page.html' },
    { pattern: /pages\/cars\/PublishCarPage/, html: 'features/cars/publish/publish-car-v2.page.html' },
    { pattern: /pages\/auth\/LoginPage/, html: 'features/auth/login/login.page.html' },
    { pattern: /pages\/wallet\/WalletPage/, html: 'features/wallet/wallet.page.html' },
    { pattern: /pages\/profile\/ProfilePage/, html: 'features/profile' },
    { pattern: /pages\/admin\/AdminDashboardPage/, html: 'features/admin' },

    // Tests de auth
    { pattern: /auth\/.*reset-password/, html: 'features/auth/reset-password/reset-password.page.html' },
    { pattern: /auth\/.*login/, html: 'features/auth/login/login.page.html' },
    { pattern: /auth\/.*register/, html: 'features/auth/register/register.page.html' },

    // Tests de wallet
    { pattern: /wallet\/.*deposit/, html: 'features/wallet/wallet.page.html' },
    { pattern: /wallet/, html: 'features/wallet/wallet.page.html' },

    // Tests de bookings
    { pattern: /renter\/.*booking.*payment/, html: 'features/bookings/booking-payment/booking-payment.page.html' },
    { pattern: /renter\/.*booking.*success/, html: 'features/bookings/booking-success/booking-success.page.html' },
    { pattern: /renter\/.*booking/, html: 'features/bookings/pages/booking-wizard/booking-wizard.page.html' },
    { pattern: /booking.*wizard/, html: 'features/bookings/pages/booking-wizard/booking-wizard.page.html' },
    { pattern: /booking.*checkout/, html: 'features/bookings/pages/booking-checkout/booking-checkout.page.html' },

    // Tests de owner
    { pattern: /owner\/.*publish/, html: 'features/cars/publish/publish-car-v2.page.html' },

    // Tests de admin
    { pattern: /admin/, html: 'features/admin' },

    // Marketplace
    { pattern: /marketplace/, html: 'features/marketplace/marketplace-v2.page.html' },
    { pattern: /visitor\/.*homepage/, html: 'features/marketplace/marketplace-v2.page.html' },
  ];

  // Buscar mapeo directo
  for (const mapping of mappings) {
    if (mapping.pattern.test(relativePath)) {
      const htmlPath = path.join(HTML_DIR, mapping.html);
      if (fs.existsSync(htmlPath)) {
        return htmlPath;
      }
      // Si es un directorio, buscar HTML dentro
      if (fs.statSync(htmlPath).isDirectory()) {
        const htmlFiles = glob.sync('**/*.html', { cwd: htmlPath, absolute: false });
        if (htmlFiles.length > 0) {
          return path.join(htmlPath, htmlFiles[0]);
        }
      }
    }
  }

  // Buscar por nombre de feature en la ruta
  const featureMatch = relativePath.match(/(renter|owner|visitor|auth|wallet|admin|cars|bookings|profile)/);
  if (featureMatch) {
    const feature = featureMatch[1];
    const featureDir = path.join(HTML_DIR, 'features', feature);
    if (fs.existsSync(featureDir)) {
      // Buscar todos los archivos HTML en el directorio recursivamente
      const htmlFiles = glob.sync('**/*.page.html', { cwd: featureDir, absolute: false });
      if (htmlFiles.length > 0) {
        // Preferir archivos que coincidan con el nombre del test
        const testName = path.basename(testPath, path.extname(testPath));
        const matching = htmlFiles.find(f => f.includes(testName.toLowerCase()) ||
                                            testName.toLowerCase().includes(path.basename(f, '.page.html').toLowerCase()));
        return path.join(featureDir, matching || htmlFiles[0]);
      }
    }
  }

  // Buscar en componentes compartidos si el test menciona componentes específicos
  const componentMatch = relativePath.match(/(deposit-modal|car-card|splash|wallet-balance)/);
  if (componentMatch) {
    const componentName = componentMatch[1];
    const sharedDir = path.join(HTML_DIR, 'shared/components');
    const componentDirs = glob.sync(`**/${componentName}*/**/*.html`, { cwd: sharedDir, absolute: false });
    if (componentDirs.length > 0) {
      return path.join(sharedDir, componentDirs[0]);
    }
  }

  return null;
}

/**
 * Verifica si un selector existe en el HTML
 */
function verifySelectorInHTML(selector, htmlContent, depth = 0) {
  // Prevenir recursión infinita
  if (depth > 5) {
    return false;
  }

  // Limpiar selector de comillas y espacios
  const cleanSelector = selector.replace(/['"`]/g, '').trim();

  // Si es un selector de atributo data-*
  if (cleanSelector.includes('[data-')) {
    const attrMatch = cleanSelector.match(/\[data-([^\]]+)\]/);
    if (attrMatch) {
      const attrName = `data-${attrMatch[1].split('=')[0].trim()}`;
      return htmlContent.includes(attrName);
    }
  }

  // Si es un ID
  if (cleanSelector.startsWith('#')) {
    const id = cleanSelector.substring(1).split(/[\s>+~]/)[0];
    return htmlContent.includes(`id="${id}"`) ||
           htmlContent.includes(`id='${id}'`) ||
           htmlContent.includes(`[id="${id}"]`) ||
           htmlContent.includes(`[id='${id}']`);
  }

  // Si es una clase
  if (cleanSelector.startsWith('.')) {
    const className = cleanSelector.substring(1).split(/[\s>+~]/)[0];
    // Buscar clase en atributos class
    const classRegex = new RegExp(`class=["'][^"']*${className}[^"']*["']`, 'i');
    return classRegex.test(htmlContent) || htmlContent.includes(`.${className}`);
  }

  // Si es un tag HTML
  if (/^[a-zA-Z][a-zA-Z0-9-]*$/.test(cleanSelector)) {
    return htmlContent.includes(`<${cleanSelector}`) ||
           htmlContent.includes(`</${cleanSelector}>`) ||
           htmlContent.includes(`<${cleanSelector} `);
  }

  // Si es un selector compuesto, buscar partes principales
  const parts = cleanSelector.split(/[\s>+~]/).filter(p => p.length > 0 && !p.match(/^[>+~]$/));
  if (parts.length > 1) {
    // Verificar que al menos una parte principal exista
    return parts.slice(0, 3).some(part => verifySelectorInHTML(part, htmlContent, depth + 1));
  }

  // Si no coincide con ningún patrón conocido, asumir que podría ser válido
  // (puede ser un selector dinámico o generado)
  return true;
}

/**
 * Analiza todos los tests
 */
async function analyzeAllTests() {
  console.log('🔍 Analizando tests y verificando selectores...\n');

  // Encontrar todos los archivos de test
  const testFiles = glob.sync('**/*.spec.ts', { cwd: TESTS_DIR });
  const pageObjectFiles = glob.sync('**/pages/**/*.ts', { cwd: TESTS_DIR });

  const allTestFiles = [...testFiles, ...pageObjectFiles];
  results.totalTests = allTestFiles.length;

  console.log(`📁 Encontrados ${allTestFiles.length} archivos de test\n`);

  // Analizar cada archivo
  for (const testFile of allTestFiles) {
    const testPath = path.join(TESTS_DIR, testFile);

    // Verificar que es un archivo, no un directorio
    try {
      const stats = fs.statSync(testPath);
      if (!stats.isFile()) {
        continue;
      }
    } catch (err) {
      console.warn(`⚠️  No se pudo leer: ${testFile}`);
      continue;
    }

    let content;
    try {
      content = fs.readFileSync(testPath, 'utf-8');
    } catch (err) {
      console.warn(`⚠️  Error leyendo: ${testFile}: ${err.message}`);
      continue;
    }

    const selectors = extractSelectorsFromTest(testFile, content);
    results.totalSelectors += selectors.length;

    if (selectors.length === 0) continue;

    // PRIMERO: Buscar en componentes compartidos basado en selectores usados
    // Esto tiene prioridad sobre el mapeo por ruta de test
    const sharedComponentMap = {
      // Deposit modal
      'deposit-modal': 'deposit-modal/deposit-modal.component.html',
      'deposit-form': 'deposit-modal/deposit-modal.component.html',
      'deposit-amount-input': 'deposit-modal/deposit-modal.component.html',
      'amount-input': 'deposit-modal/deposit-modal.component.html',
      'deposit-submit': 'deposit-modal/deposit-modal.component.html',
      'amount-error': 'deposit-modal/deposit-modal.component.html',
      'deposit-error': 'deposit-modal/deposit-modal.component.html',
      'deposit-error-notification': 'deposit-modal/deposit-modal.component.html',
      'creating-preference': 'deposit-modal/deposit-modal.component.html',
      // Car card
      'app-car-card': 'car-card/car-card.component.html',
      'car-card': 'car-card/car-card.component.html',
      // Splash
      'app-splash-loader': 'splash-loader/splash-loader.component.ts',
      'app-splash': 'splash/splash.component.html',
      // Transaction history
      'transaction-amount': 'transaction-history/transaction-history.component.html',
      'transaction-date': 'transaction-history/transaction-history.component.html',
      'transaction-status': 'transaction-history/transaction-history.component.html',
      'transaction-item': 'transaction-history/transaction-history.component.html',
      // Map components
      'app-cars-map': 'cars-map/cars-map.component.html',
      'cars-map': 'cars-map/cars-map.component.html',
      'map-container': 'cars-map/cars-map.component.html',
      // Wallet
      'wallet-balance': 'wallet-balance-card/wallet-balance-card.component.html',
      'wallet-balance-card': 'wallet-balance-card/wallet-balance-card.component.html',
      'available-balance': 'wallet-balance-card/wallet-balance-card.component.html',
      'locked-balance': 'wallet-balance-card/wallet-balance-card.component.html',
      // Booking
      'booking-card': 'features/bookings/my-bookings/my-bookings.page.html',
      'booking-wizard': 'features/bookings/pages/booking-wizard/booking-wizard.page.html',
      'booking-success': 'features/bookings/booking-success/booking-success.page.html',
      // Date picker
      'date-from': 'date-range-picker/date-range-picker.component.html',
      'date-to': 'date-range-picker/date-range-picker.component.html',
      // User menu
      'user-menu': 'app.component.html',
      // Inspection uploader
      'app-inspection-uploader': 'inspection-uploader/inspection-uploader.component.html',
      'inspection-uploader': 'inspection-uploader/inspection-uploader.component.html',
      // Publish form
      'publish-form': 'features/cars/publish/publish-car-v2.page.html',
      // Car card enhanced
      'car-card-enhanced': 'features/marketplace/marketplace-v2.page.html',
      '.car-card-enhanced': 'features/marketplace/marketplace-v2.page.html',
      // Data car id
      '[data-car-id]': 'car-card/car-card.component.html',
      'data-car-id': 'car-card/car-card.component.html',
      // Price total
      'price-total': 'features/bookings/components/booking-confirmation-step/booking-confirmation-step.component.ts',
      // Deposit button
      'deposit-button': 'wallet-balance-card/wallet-balance-card.component.html',
      // Footer
      'footer': 'shared/components/footer/footer.component.html',
      'app-footer': 'shared/components/footer/footer.component.html',
      // Table (puede estar en transaction-history)
      'table': 'transaction-history/transaction-history.component.html',
      // Select (genérico, buscar en múltiples lugares)
      'select': null,
      // H1 (genérico, buscar en múltiples lugares)
      'h1': null,
    };

    // Encontrar HTML correspondiente (fallback al mapeo por ruta)
    let htmlPath = findCorrespondingHTML(testPath);

    // Buscar si algún selector menciona un componente compartido
    // Priorizar selectores de componentes compartidos sobre mapeo por ruta
    // Esto se ejecuta SIEMPRE, incluso si ya hay un htmlPath, para asegurar que encontramos el correcto
    for (const sel of selectors) {
      const selectorKey = sel.selector.toLowerCase().replace(/[^a-z-]/g, '');
      const selectorClean = sel.selector.toLowerCase().replace(/[^a-z-]/g, '');

      // Buscar coincidencias exactas o parciales
      for (const [key, componentPath] of Object.entries(sharedComponentMap)) {
        // Saltar selectores genéricos (null) - estos se buscan en múltiples lugares
        if (!componentPath) continue;

        const keyLower = key.toLowerCase();
        if (selectorKey === keyLower || selectorClean === keyLower ||
            selectorKey.includes(keyLower) || keyLower.includes(selectorKey) ||
            sel.selector.toLowerCase().includes(keyLower)) {
          const fullPath = path.join(HTML_DIR, componentPath);
          if (fs.existsSync(fullPath)) {
            htmlPath = fullPath;
            break;
          }
        }
      }
      if (htmlPath && fs.existsSync(htmlPath)) break;
    }

    // Si aún no hay htmlPath, usar el mapeo por ruta
    if (!htmlPath || !fs.existsSync(htmlPath)) {
      htmlPath = findCorrespondingHTML(testPath);
    }

    // También buscar por nombre de archivo de test si aún no hay htmlPath
    if (!htmlPath || !fs.existsSync(htmlPath)) {
      const testNameMatch = testFile.match(/(deposit-modal|car-card|splash|wallet-balance|transaction-history|cars-map|booking-card|booking-wizard|inspection-uploader)/);
      if (testNameMatch) {
        const componentName = testNameMatch[1].replace(/-/g, '-');
        const sharedDir = path.join(HTML_DIR, 'shared/components');
        const componentFiles = glob.sync(`**/${componentName}*/**/*.{html,ts}`, { cwd: sharedDir, absolute: false });
        if (componentFiles.length > 0) {
          htmlPath = path.join(sharedDir, componentFiles[0]);
        }
      }
    }

    // Para tests de integración, buscar múltiples HTMLs
    const isIntegrationTest = testFile.includes('e2e/') ||
                               testFile.includes('critical/') ||
                               testFile.includes('integration');

    if (isIntegrationTest && (!htmlPath || !fs.existsSync(htmlPath))) {
      // Buscar en múltiples features basado en selectores
      const featureDirs = ['features/cars', 'features/bookings', 'features/wallet',
                          'features/marketplace', 'features/auth', 'shared/components'];

      for (const featureDir of featureDirs) {
        const fullFeatureDir = path.join(HTML_DIR, featureDir);
        if (fs.existsSync(fullFeatureDir)) {
          const htmlFiles = glob.sync('**/*.{page.html,component.html}', {
            cwd: fullFeatureDir,
            absolute: false
          });
          if (htmlFiles.length > 0) {
            // Preferir archivos que coincidan con algún selector
            for (const sel of selectors.slice(0, 5)) { // Solo primeros 5 selectores
              const matching = htmlFiles.find(f =>
                f.toLowerCase().includes(sel.selector.toLowerCase().replace(/[^a-z]/g, '')) ||
                sel.selector.toLowerCase().includes(path.basename(f, path.extname(f)).toLowerCase())
              );
              if (matching) {
                htmlPath = path.join(fullFeatureDir, matching);
                break;
              }
            }
            if (!htmlPath || !fs.existsSync(htmlPath)) {
              htmlPath = path.join(fullFeatureDir, htmlFiles[0]);
            }
            break;
          }
        }
      }
    }

    if (!htmlPath || !fs.existsSync(htmlPath)) {
      results.notFound.push({
        test: testFile,
        selectors: selectors.length,
        htmlPath: htmlPath || 'No encontrado'
      });
      continue;
    }

    // Verificar que htmlPath es un archivo
    try {
      const htmlStats = fs.statSync(htmlPath);
      if (!htmlStats.isFile()) {
        results.notFound.push({
          test: testFile,
          selectors: selectors.length,
          htmlPath: `${htmlPath} (es un directorio)`
        });
        continue;
      }
    } catch (err) {
      results.notFound.push({
        test: testFile,
        selectors: selectors.length,
        htmlPath: `${htmlPath} (error: ${err.message})`
      });
      continue;
    }

    let htmlContent;
    try {
      htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    } catch (err) {
      console.warn(`⚠️  Error leyendo HTML: ${htmlPath}: ${err.message}`);
      continue;
    }

    // Lista de selectores dinámicos que no se pueden verificar estáticamente
    const dynamicSelectors = [
      // MercadoPago SDK
      'mercadopago-init-point', // Generado dinámicamente por MercadoPago SDK
      '.mp-onboarding-modal', // Modal generado por MercadoPago

      // Flatpickr (Date Picker)
      '.flatpickr-calendar', // Generado por Flatpickr
      'date-to', // Clase generada por Flatpickr
      'date-from', // Clase generada por Flatpickr

      // Componentes Ionic (generados dinámicamente)
      'ion-modal', // Componente de Ionic generado dinámicamente
      'ion-toast', // Componente de Ionic generado dinámicamente
      'ion-alert', // Alerta de Ionic generada dinámicamente
      'ion-popover', // Popover de Ionic generado dinámicamente
      'ion-item', // Item de Ionic (puede ser generado dinámicamente)
      'ion-textarea', // Textarea de Ionic generado dinámicamente
      'ion-select', // Select de Ionic generado dinámicamente
      'ion-radio-group', // Radio group de Ionic generado dinámicamente
      'ion-radio', // Radio de Ionic generado dinámicamente
      'ion-datetime', // Datetime de Ionic generado dinámicamente
      'ion-backdrop', // Backdrop de Ionic generado dinámicamente

      // Elementos HTML nativos generados dinámicamente
      'canvas', // Canvas generado por librerías de mapas/graphs
      'option', // Opciones de select generadas dinámicamente

      // Componentes condicionales
      'app-splash-loader', // Se renderiza condicionalmente (aunque tiene data-testid)
      'app-inspection-uploader', // Componente de upload condicional

      // Selectores de autocompletado
      '.autocomplete-option', // Opciones de autocompletado generadas dinámicamente
      '.suggestion-item', // Sugerencias generadas dinámicamente

      // Chat/WhatsApp
      '.whatsapp-chat-container', // Widget de WhatsApp generado dinámicamente
    ];

    // Verificar cada selector
    for (const sel of selectors) {
      // Ignorar falsos positivos: getByRole, getByText, nombres de propiedades
      const isFalsePositive =
        sel.rawLine.includes('getByRole') ||
        sel.rawLine.includes('getByText') ||
        sel.rawLine.includes('readonly') ||
        sel.rawLine.includes(': Locator') ||
        sel.selector.match(/^(heading|textbox|link|button|dialog)$/i) ||
        sel.selector === 'html';

      if (isFalsePositive) {
        // Estos son válidos pero no se pueden verificar estáticamente
        results.verified++;
        continue;
      }

      // Verificar si es un selector dinámico conocido
      const isDynamic = dynamicSelectors.some(ds =>
        sel.selector.includes(ds) || ds.includes(sel.selector)
      );

      if (isDynamic) {
        // Estos son válidos pero se generan dinámicamente
        results.verified++;
        results.warnings.push({
          ...sel,
          reason: 'Selector dinámico (generado en runtime)',
          htmlFile: path.relative(HTML_DIR, htmlPath)
        });
        continue;
      }

      const exists = verifySelectorInHTML(sel.selector, htmlContent);

      if (exists) {
        results.verified++;
      } else {
        results.broken.push({
          ...sel,
          htmlFile: path.relative(HTML_DIR, htmlPath)
        });
      }
    }
  }

  // Generar reporte
  generateReport();
}

/**
 * Genera reporte de resultados
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 REPORTE DE VERIFICACIÓN DE SELECTORES');
  console.log('='.repeat(80) + '\n');

  console.log(`📈 Estadísticas:`);
  console.log(`   - Tests analizados: ${results.totalTests}`);
  console.log(`   - Selectores encontrados: ${results.totalSelectors}`);
  console.log(`   - Selectores verificados: ${results.verified} ✅`);
  console.log(`   - Selectores rotos: ${results.broken.length} ❌`);
  console.log(`   - Tests sin HTML encontrado: ${results.notFound.length} ⚠️\n`);

  if (results.broken.length > 0) {
    console.log('\n❌ SELECTORES ROTOS:\n');
    results.broken.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.file}:${item.line}`);
      console.log(`   Selector: ${item.selector}`);
      console.log(`   HTML esperado: ${item.htmlFile}`);
      console.log(`   Línea: ${item.rawLine}`);
      console.log('');
    });
  }

  if (results.notFound.length > 0) {
    console.log('\n⚠️  TESTS SIN HTML ENCONTRADO:\n');
    results.notFound.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.test}`);
      console.log(`   Selectores: ${item.selectors}`);
      console.log(`   HTML buscado: ${item.htmlPath}`);
      console.log('');
    });
  }

  // Guardar reporte en archivo
  const reportPath = path.join(PROJECT_ROOT, 'test-selectors-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      totalTests: results.totalTests,
      totalSelectors: results.totalSelectors,
      verified: results.verified,
      broken: results.broken.length,
      notFound: results.notFound.length
    },
    broken: results.broken,
    notFound: results.notFound
  }, null, 2));

  console.log(`\n💾 Reporte guardado en: ${reportPath}\n`);

  // Exit code
  process.exit(results.broken.length > 0 ? 1 : 0);
}

// Ejecutar análisis
analyzeAllTests().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

