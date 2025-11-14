import { test, expect } from '@playwright/test';

/**
 * Test simple para verificar CDP connection
 */

test('should connect via CDP and load page', async ({ page }) => {
  console.log('🔗 Conectando via CDP...');
  
  // Navegar a la página principal
  await page.goto('/');
  console.log('📄 Página cargada');
  
  // Esperar a que la página esté lista
  await page.waitForLoadState('domcontentloaded');
  
  // Verificar que estamos conectados
  const title = await page.title();
  console.log(`📋 Título: ${title}`);
  
  // Tomar screenshot
  await page.screenshot({ path: 'test-results/cdp-screenshot.png' });
  console.log('📸 Screenshot guardado');
  
  // Verificar que la página tiene contenido
  const body = await page.textContent('body');
  expect(body).toBeTruthy();
  
  console.log('✅ Test CDP completado exitosamente');
});