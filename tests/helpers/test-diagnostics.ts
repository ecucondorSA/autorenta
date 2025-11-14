/**
 * Test Diagnostics Helpers
 *
 * Funciones útiles para debugging y diagnóstico de tests E2E
 * Extraído y mejorado del PR #190
 */

import { Page } from '@playwright/test';

export interface StepResult {
  step: string;
  success: boolean;
  duration: number;
  screenshot?: string;
  error?: string;
}

/**
 * Captura un paso del test con screenshot y métricas
 * Útil para debugging cuando los tests fallan
 */
export const captureStep = async (
  page: Page,
  stepName: string,
  action: () => Promise<void>
): Promise<StepResult> => {
  console.log(`\n📍 Ejecutando: ${stepName}`);
  const start = Date.now();
  const sanitizedStepName = stepName.replace(/[^a-z0-9]/gi, '-').toLowerCase();

  try {
    await action();

    const screenshotPath = `test-results/screenshots/${sanitizedStepName}-success.png`;
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    const duration = Date.now() - start;
    console.log(`✅ ${stepName} completado en ${duration}ms`);

    return {
      step: stepName,
      success: true,
      duration,
      screenshot: screenshotPath
    };
  } catch (error) {
    const screenshotPath = `test-results/screenshots/${sanitizedStepName}-error.png`;
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    const duration = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${stepName} falló después de ${duration}ms: ${errorMessage}`);

    return {
      step: stepName,
      success: false,
      duration,
      screenshot: screenshotPath,
      error: errorMessage
    };
  }
};

/**
 * Configura collectors de errores para debugging
 * Captura console logs, errores de red y errores de JS
 */
export const setupErrorCollectors = (page: Page) => {
  const consoleLogs: string[] = [];
  const networkErrors: { url: string; status: number; statusText: string }[] = [];
  const jsErrors: string[] = [];

  // Capturar logs de consola
  page.on('console', (msg) => {
    const logMessage = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(logMessage);

    if (msg.type() === 'error') {
      console.log('🔴 Console Error:', logMessage);
    }
  });

  // Capturar errores de red
  page.on('response', (response) => {
    if (response.status() >= 400) {
      const error = {
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      };
      networkErrors.push(error);
      console.log(`🔴 Network Error: ${error.status} ${error.url}`);
    }
  });

  // Capturar errores de JavaScript
  page.on('pageerror', (error) => {
    jsErrors.push(error.message);
    console.log('🔴 JS Error:', error.message);
  });

  return {
    consoleLogs,
    networkErrors,
    jsErrors,

    // Métodos útiles para debugging
    getErrorSummary: () => ({
      consoleErrors: consoleLogs.filter(log => log.includes('[error]')),
      networkErrors,
      jsErrors,
      totalErrors: consoleLogs.filter(log => log.includes('[error]')).length +
                   networkErrors.length +
                   jsErrors.length
    }),

    printErrors: () => {
      const summary = {
        consoleErrors: consoleLogs.filter(log => log.includes('[error]')),
        networkErrors,
        jsErrors
      };

      if (summary.consoleErrors.length > 0) {
        console.log('\n📋 Console Errors:', summary.consoleErrors);
      }
      if (summary.networkErrors.length > 0) {
        console.log('\n🌐 Network Errors:', summary.networkErrors);
      }
      if (summary.jsErrors.length > 0) {
        console.log('\n🚨 JavaScript Errors:', summary.jsErrors);
      }
    }
  };
};

/**
 * Espera inteligente para elementos de Ionic
 * Ionic tiene animaciones que requieren esperas especiales
 */
export const waitForIonicAnimation = async (page: Page, duration: number = 300) => {
  await page.waitForTimeout(duration);
};

/**
 * Toma screenshot con timestamp para debugging
 */
export const takeTimestampedScreenshot = async (page: Page, name: string) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `test-results/screenshots/${name}-${timestamp}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`📸 Screenshot guardado: ${path}`);
  return path;
};

/**
 * Genera reporte de test results
 */
export const generateTestReport = (results: StepResult[]) => {
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log('\n' + '='.repeat(50));
  console.log('📊 REPORTE DE TEST');
  console.log('='.repeat(50));
  console.log(`✅ Pasos exitosos: ${successCount}`);
  console.log(`❌ Pasos fallidos: ${failureCount}`);
  console.log(`⏱️ Duración total: ${totalDuration}ms`);
  console.log('='.repeat(50));

  if (failureCount > 0) {
    console.log('\n🔴 Pasos que fallaron:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.step}: ${r.error}`);
    });
  }

  return {
    successCount,
    failureCount,
    totalDuration,
    successRate: (successCount / results.length) * 100
  };
};