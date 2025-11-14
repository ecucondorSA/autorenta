#!/usr/bin/env node

const { chromium } = require('playwright');

async function debugFlow() {
  console.log('🚀 Iniciando debug simple...\n');
  
  // Lanzar browser nuevo
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000  // Ralentizar acciones para verlas
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // PASO 1: Ir a la app
    console.log('📍 Navegando a http://localhost:4200');
    await page.goto('http://localhost:4200');
    await page.waitForLoadState('networkidle');
    
    // Screenshot inicial
    await page.screenshot({ path: 'debug-1-home.png', fullPage: true });
    console.log('✅ Screenshot: debug-1-home.png');
    
    // PASO 2: Ir directo a publicar (asumiendo que está logueado)
    console.log('\n🚗 Navegando a /cars/publish');
    await page.goto('http://localhost:4200/cars/publish');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'debug-2-publish-page.png', fullPage: true });
    console.log('✅ Screenshot: debug-2-publish-page.png');
    
    // PASO 3: Analizar formulario
    console.log('\n📋 Analizando elementos del formulario...');
    
    // Listar todos los inputs y selects
    const inputs = await page.locator('input, select, ion-input, ion-select').all();
    console.log(`📝 Encontrados ${inputs.length} campos de formulario`);
    
    for (let i = 0; i < Math.min(inputs.length, 10); i++) {
      const element = inputs[i];
      const tagName = await element.evaluate(el => el.tagName.toLowerCase());
      const name = await element.getAttribute('name') || 'sin-nombre';
      const type = await element.getAttribute('type') || 'sin-tipo';
      const placeholder = await element.getAttribute('placeholder') || 'sin-placeholder';
      
      console.log(`  ${i + 1}. ${tagName} - name: "${name}" - type: "${type}" - placeholder: "${placeholder}"`);
    }
    
    // PASO 4: Buscar específicamente campos de auto
    console.log('\n🔍 Buscando campos específicos...');
    
    const brandField = await page.locator('input[name*="brand"], select[name*="brand"], [placeholder*="marca"]').first();
    const brandVisible = await brandField.isVisible().catch(() => false);
    console.log(`🏷️  Campo marca encontrado: ${brandVisible}`);
    
    const modelField = await page.locator('input[name*="model"], select[name*="model"], [placeholder*="modelo"]').first();
    const modelVisible = await modelField.isVisible().catch(() => false);
    console.log(`🚙 Campo modelo encontrado: ${modelVisible}`);
    
    const priceField = await page.locator('input[name*="price"], input[type="number"], [placeholder*="precio"]').first();
    const priceVisible = await priceField.isVisible().catch(() => false);
    console.log(`💰 Campo precio encontrado: ${priceVisible}`);
    
    // PASO 5: Intentar llenar lo que encontremos
    if (brandVisible) {
      console.log('\n✏️ Llenando campo marca...');
      await brandField.fill('Porsche');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'debug-3-brand-filled.png', fullPage: true });
    }
    
    if (modelVisible) {
      console.log('✏️ Llenando campo modelo...');
      await modelField.fill('Carrera');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'debug-4-model-filled.png', fullPage: true });
    }
    
    if (priceVisible) {
      console.log('✏️ Llenando campo precio...');
      await priceField.fill('120000');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'debug-5-price-filled.png', fullPage: true });
    }
    
    // PASO 6: Buscar botón de publicar
    console.log('\n🚀 Buscando botón de publicar...');
    const publishButtons = await page.locator('button:has-text("Publicar"), button[type="submit"], button:has-text("Enviar")').all();
    console.log(`📤 Botones encontrados: ${publishButtons.length}`);
    
    if (publishButtons.length > 0) {
      console.log('🔍 Haciendo click en botón de publicar...');
      await publishButtons[0].click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'debug-6-after-click.png', fullPage: true });
      
      console.log('📍 URL después del click:', page.url());
    }
    
    // PASO 7: Ir a mis autos
    console.log('\n👁️ Verificando mis autos...');
    await page.goto('http://localhost:4200/cars/my');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'debug-7-my-cars.png', fullPage: true });
    
    // Contar autos
    const carElements = await page.locator('.car-card, .auto-item, [class*="car"], .vehicle-card').all();
    console.log(`🚗 Elementos de autos encontrados: ${carElements.length}`);
    
    // Buscar texto específico
    const pageText = await page.textContent('body');
    const hasPorsche = pageText.toLowerCase().includes('porsche');
    const hasBorrador = pageText.toLowerCase().includes('borrador');
    console.log(`🏷️  Texto "Porsche" en la página: ${hasPorsche}`);
    console.log(`📝 Texto "Borrador" en la página: ${hasBorrador}`);
    
    console.log('\n🎯 Debug completado! Screenshots guardados.');
    console.log('\n📋 Archivos generados:');
    console.log('- debug-1-home.png');
    console.log('- debug-2-publish-page.png');
    console.log('- debug-3-brand-filled.png (si existe campo marca)');
    console.log('- debug-4-model-filled.png (si existe campo modelo)');
    console.log('- debug-5-price-filled.png (si existe campo precio)');
    console.log('- debug-6-after-click.png');
    console.log('- debug-7-my-cars.png');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'debug-error.png', fullPage: true });
  } finally {
    // Mantener el browser abierto para inspección
    console.log('\n⏸️ Browser mantenido abierto para inspección...');
    // await browser.close();
  }
}

debugFlow();