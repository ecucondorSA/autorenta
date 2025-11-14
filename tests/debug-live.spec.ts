import { test, expect } from '@playwright/test';

/**
 * Test de ejemplo para debugging en vivo con Chrome CDP
 * 
 * Para usar:
 * 1. ./scripts/chrome-dev.sh
 * 2. pnpm run dev (en otra terminal)
 * 3. ./scripts/test-live.sh test
 */

test.describe('Live Debug Tests', () => {
  test('should load homepage and navigate', async ({ page }) => {
    console.log('🏠 Navegando a homepage...');
    await page.goto('/');
    
    // Esperar a que cargue
    await page.waitForLoadState('networkidle');
    
    // Verificar título
    await expect(page).toHaveTitle(/AutoRenta/);
    console.log('✅ Homepage cargada');
    
    // Pausar para ver en vivo
    await page.pause();
    
    // Buscar botón de login
    const loginButton = page.locator('[data-testid="login-button"], .login-btn, button:has-text("Iniciar")');
    if (await loginButton.count() > 0) {
      console.log('🔐 Haciendo click en login...');
      await loginButton.first().click();
      
      // Pausar después del click
      await page.pause();
    }
    
    console.log('🏁 Test completado');
  });

  test('should navigate to publish page', async ({ page }) => {
    console.log('📝 Navegando a página de publicar...');
    await page.goto('/publish');
    
    // Esperar carga
    await page.waitForLoadState('networkidle');
    
    // Pausar para inspeccionar
    await page.pause();
    
    console.log('✅ Página de publicar cargada');
  });

  test('interactive debug session', async ({ page }) => {
    console.log('🎯 Sesión de debug interactiva');
    await page.goto('/');
    
    // Pausar inmediatamente para control manual
    console.log('⏸️  Sesión pausada - usa las DevTools para continuar');
    await page.pause();
  });
});