import { test, expect } from '@playwright/test';

test('Demo Visual Debug - AutoRenta Homepage', async ({ page }) => {
  console.log('🚀 Iniciando demo visual de AutoRenta...');
  
  // 1. Navegar a homepage
  await page.goto('/');
  console.log('✅ Homepage cargada');
  
  // 2. Esperar y tomar screenshot
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'demo-homepage.png', fullPage: true });
  console.log('📸 Screenshot de homepage guardado');
  
  // 3. Verificar título
  const title = await page.title();
  console.log(`📋 Título de página: "${title}"`);
  expect(title).toContain('AutoRenta');
  
  // 4. Buscar elementos principales
  const navigation = await page.locator('nav, .navbar, [role="navigation"]').count();
  const buttons = await page.locator('button').count();
  const links = await page.locator('a').count();
  
  console.log(`🧭 Elementos encontrados:`);
  console.log(`   - Navegación: ${navigation}`);
  console.log(`   - Botones: ${buttons}`);
  console.log(`   - Enlaces: ${links}`);
  
  // 5. Interactuar con elementos visibles
  const visibleButtons = page.locator('button:visible');
  const buttonCount = await visibleButtons.count();
  
  if (buttonCount > 0) {
    const firstButton = visibleButtons.first();
    const buttonText = await firstButton.textContent();
    console.log(`🔘 Primer botón visible: "${buttonText}"`);
    
    // Highlight el botón
    await firstButton.highlight();
    await page.waitForTimeout(1000);
  }
  
  console.log('🎯 Demo completado - verifica Chrome para ver las acciones en vivo');
});