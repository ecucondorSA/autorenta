#!/usr/bin/env node

const { chromium } = require('playwright');

async function completeFlow() {
  console.log('🚀 Flujo completo: Login → Publicar Auto\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // PASO 1: Login
    console.log('🔐 PASO 1: Haciendo login...');
    await page.goto('http://localhost:4200');
    await page.waitForLoadState('networkidle');
    
    // Verificar si ya está logueado
    const isLoggedIn = await page.locator('text=/Mi perfil|Perfil|Cerrar sesión/i').isVisible().catch(() => false);
    
    if (!isLoggedIn) {
      // Ir al login
      await page.goto('http://localhost:4200/auth/login');
      await page.waitForLoadState('networkidle');
      
      // Llenar formulario
      await page.fill('input[name="email"], input[type="email"]', 'Ecucondor@gmail.com');
      await page.fill('input[name="password"], input[type="password"]', 'Ab.12345');
      
      await page.screenshot({ path: 'complete-1-login-filled.png', fullPage: true });
      
      // Submit
      await page.click('button[type="submit"], button:has-text("Iniciar sesión")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      console.log('✅ Login completado');
      console.log('📍 URL después del login:', page.url());
    }
    
    await page.screenshot({ path: 'complete-2-logged-in.png', fullPage: true });
    
    // PASO 2: Ir a publicar auto
    console.log('\n🚗 PASO 2: Navegando a publicar auto...');
    await page.goto('http://localhost:4200/cars/publish');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);  // Esperar más tiempo para que cargue completamente
    
    await page.screenshot({ path: 'complete-3-publish-page.png', fullPage: true });
    
    // PASO 3: Analizar formulario después del login
    console.log('\n📋 PASO 3: Analizando formulario de publicación...');
    
    // Buscar todos los campos
    const allInputs = await page.locator('input, select, ion-input, ion-select, textarea').all();
    console.log(`📝 Total de campos encontrados: ${allInputs.length}`);
    
    // Buscar campos específicos del auto
    const brandSelectors = [
      'input[name*="brand"]',
      'select[name*="brand"]', 
      'ion-select[name*="brand"]',
      '[placeholder*="marca" i]',
      'input[name*="marca"]'
    ];
    
    let brandField = null;
    for (const selector of brandSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible().catch(() => false)) {
        brandField = element;
        console.log(`🏷️  Campo marca encontrado con selector: ${selector}`);
        break;
      }
    }
    
    // Si encontramos el campo de marca, continuar
    if (brandField) {
      console.log('\n✏️ PASO 4: Llenando formulario...');
      
      // Marca
      await brandField.fill('Porsche');
      await page.waitForTimeout(1000);
      console.log('✅ Marca: Porsche');
      
      // Modelo (esperar a que se habilite después de seleccionar marca)
      await page.waitForTimeout(2000);
      const modelField = page.locator('input[name*="model"], select[name*="model"], ion-select[name*="model"]').first();
      if (await modelField.isVisible().catch(() => false)) {
        await modelField.fill('Carrera');
        console.log('✅ Modelo: Carrera');
      }
      
      // Año
      const yearField = page.locator('input[name*="year"], input[name*="año"]').first();
      if (await yearField.isVisible().catch(() => false)) {
        await yearField.fill('2023');
        console.log('✅ Año: 2023');
      }
      
      // Precio
      const priceField = page.locator('input[name*="price"], input[name*="precio"]').first();
      if (await priceField.isVisible().catch(() => false)) {
        await priceField.fill('120000');
        console.log('✅ Precio: $120,000');
      }
      
      await page.screenshot({ path: 'complete-4-form-filled.png', fullPage: true });
      
      // PASO 5: Publicar
      console.log('\n🚀 PASO 5: Publicando auto...');
      const publishButton = page.locator('button:has-text("Publicar"), button[type="submit"]').first();
      
      if (await publishButton.isVisible().catch(() => false)) {
        await publishButton.click();
        await page.waitForTimeout(5000);  // Esperar respuesta del servidor
        
        console.log('✅ Click en publicar ejecutado');
        console.log('📍 URL después de publicar:', page.url());
        
        await page.screenshot({ path: 'complete-5-after-publish.png', fullPage: true });
      }
      
      // PASO 6: Verificar en mis autos
      console.log('\n👁️ PASO 6: Verificando mis autos...');
      await page.goto('http://localhost:4200/cars/my');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      const pageContent = await page.textContent('body');
      const hasPorsche = pageContent.toLowerCase().includes('porsche');
      const hasCarrera = pageContent.toLowerCase().includes('carrera');
      const hasBorrador = pageContent.toLowerCase().includes('borrador');
      
      console.log(`🏷️  Encuentra "Porsche": ${hasPorsche}`);
      console.log(`🚙 Encuentra "Carrera": ${hasCarrera}`);
      console.log(`📝 Encuentra "Borrador": ${hasBorrador}`);
      
      // Contar elementos de autos
      const carElements = await page.locator('[class*="car"], .auto-item, .vehicle').all();
      console.log(`🚗 Elementos de autos: ${carElements.length}`);
      
      await page.screenshot({ path: 'complete-6-my-cars.png', fullPage: true });
      
    } else {
      console.log('❌ No se encontró formulario de publicación - puede que no esté autenticado correctamente');
      
      // Capturar el contenido de la página para debug
      const pageTitle = await page.title();
      const pageUrl = page.url();
      console.log(`📍 Título: ${pageTitle}`);
      console.log(`📍 URL: ${pageUrl}`);
      
      // Verificar si hay mensaje de error o redirección
      const bodyText = await page.textContent('body');
      console.log(`📝 Contenido (primeros 200 chars): ${bodyText.substring(0, 200)}...`);
    }
    
    console.log('\n🎯 Flujo completado!');
    console.log('\n📋 Screenshots generados:');
    console.log('- complete-1-login-filled.png');
    console.log('- complete-2-logged-in.png');
    console.log('- complete-3-publish-page.png');
    console.log('- complete-4-form-filled.png');
    console.log('- complete-5-after-publish.png');
    console.log('- complete-6-my-cars.png');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'complete-error.png', fullPage: true });
  }
  
  console.log('\n⏸️ Browser mantenido abierto. Presiona Ctrl+C cuando termines de inspeccionar.');
}

completeFlow();