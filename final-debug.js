#!/usr/bin/env node

const { chromium } = require('playwright');

async function finalDebug() {
  console.log('🎯 FINAL DEBUG: Con selectores exactos\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000  // Muy lento para ver cada paso
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capturar logs importantes del componente
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('PublishCarV2') || text.includes('Brand selected') || text.includes('models')) {
      console.log(`[APP]: ${text}`);
    }
  });

  try {
    // Login
    console.log('🔐 LOGIN');
    await page.goto('http://localhost:4200/auth/login');
    await page.fill('input[name="email"]', 'Ecucondor@gmail.com');
    await page.fill('input[name="password"]', 'Ab.12345');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    console.log('✅ Logueado\n');

    // Ir a publicar
    console.log('🚗 NAVEGACIÓN A PUBLICAR');
    await page.goto('http://localhost:4200/cars/publish');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(4000);
    console.log('✅ En página de publicar\n');

    await page.screenshot({ path: 'final-1-publish-page.png', fullPage: true });

    // PASO 1: Llenar campo marca con selector exacto
    console.log('📝 PASO 1: LLENANDO CAMPO MARCA');
    console.log('Selector usado: input[placeholder="Escribe para buscar marca (ej: VW, Ford, Fiat)"]');
    
    const brandInput = page.locator('input[placeholder="Escribe para buscar marca (ej: VW, Ford, Fiat)"]');
    
    // Verificar que existe y es visible
    await brandInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Campo marca encontrado y visible');
    
    // Limpiar y escribir
    await brandInput.click();
    await brandInput.clear();
    
    console.log('⌨️ Escribiendo "Porsche" letra por letra...');
    await brandInput.type('P', { delay: 300 });
    await page.waitForTimeout(500);
    await brandInput.type('o', { delay: 300 });
    await page.waitForTimeout(500);
    await brandInput.type('r', { delay: 300 });
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: 'final-2-typing-por.png', fullPage: true });
    
    await brandInput.type('s', { delay: 300 });
    await page.waitForTimeout(500);
    await brandInput.type('c', { delay: 300 });
    await page.waitForTimeout(500);
    await brandInput.type('h', { delay: 300 });
    await page.waitForTimeout(500);
    await brandInput.type('e', { delay: 300 });
    
    console.log('✅ "Porsche" escrito completamente');
    await page.waitForTimeout(2000); // Esperar a que aparezcan sugerencias
    
    await page.screenshot({ path: 'final-3-porsche-typed.png', fullPage: true });
    
    // PASO 2: Buscar dropdown/sugerencias
    console.log('\n🔍 PASO 2: BUSCANDO SUGERENCIAS DE MARCA');
    
    // Esperar un poco más para que aparezcan las sugerencias
    await page.waitForTimeout(2000);
    
    // Buscar sugerencias visibles
    const suggestions = await page.evaluate(() => {
      // Múltiples selectores para encontrar sugerencias/dropdown
      const possibleSelectors = [
        '.dropdown-menu',
        '.suggestions',
        '.autocomplete',
        '.dropdown-content', 
        '.dropdown-list',
        '[role="listbox"]',
        '[role="menu"]',
        '.ng-dropdown-panel',
        'ul[role="listbox"]',
        '.dropdown-item',
        'li[role="option"]'
      ];
      
      let foundElements = [];
      
      for (const selector of possibleSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && el.offsetParent !== null) {
            const text = el.textContent || '';
            if (text.toLowerCase().includes('porsche')) {
              foundElements.push({
                selector,
                text: text.trim().substring(0, 100),
                innerHTML: el.innerHTML.substring(0, 200),
                hasPorsche: true,
                position: `${rect.x},${rect.y}`,
                size: `${rect.width}x${rect.height}`
              });
            } else if (text.trim().length > 0) {
              foundElements.push({
                selector,
                text: text.trim().substring(0, 100),
                innerHTML: el.innerHTML.substring(0, 200),
                hasPorsche: false,
                position: `${rect.x},${rect.y}`,
                size: `${rect.width}x${rect.height}`
              });
            }
          }
        }
      }
      
      return foundElements;
    });
    
    console.log(`📋 Sugerencias encontradas: ${suggestions.length}`);
    suggestions.forEach((sug, i) => {
      console.log(`  ${i + 1}. [${sug.selector}] "${sug.text}" - Porsche: ${sug.hasPorsche}`);
    });
    
    // Buscar específicamente elementos con "Porsche"
    const porscheSuggestions = suggestions.filter(s => s.hasPorsche);
    
    if (porscheSuggestions.length > 0) {
      console.log(`\n🎯 ¡Encontradas ${porscheSuggestions.length} sugerencias con Porsche!`);
      
      const targetSuggestion = porscheSuggestions[0];
      console.log(`Seleccionando: "${targetSuggestion.text}"`);
      
      // Intentar hacer click en la sugerencia
      const clicked = await page.evaluate((selector, text) => {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          if (el.textContent.toLowerCase().includes('porsche') && el.offsetParent !== null) {
            el.click();
            return { success: true, clickedText: el.textContent.trim() };
          }
        }
        return { success: false };
      }, targetSuggestion.selector, targetSuggestion.text);
      
      console.log(`🖱️ Click resultado: ${JSON.stringify(clicked)}`);
      
      if (clicked.success) {
        console.log('✅ ¡Click exitoso en sugerencia Porsche!');
        await page.waitForTimeout(3000); // Esperar procesamiento
        
        await page.screenshot({ path: 'final-4-porsche-selected.png', fullPage: true });
        
      } else {
        console.log('⚠️ Click falló, intentando con teclado...');
        // Fallback: usar teclado
        await brandInput.press('ArrowDown');
        await page.waitForTimeout(500);
        await brandInput.press('Enter');
        await page.waitForTimeout(2000);
        
        await page.screenshot({ path: 'final-4-keyboard-selection.png', fullPage: true });
      }
      
    } else {
      console.log('❌ No se encontraron sugerencias con Porsche');
      console.log('💡 Intentando presionar Enter para confirmar texto...');
      
      await brandInput.press('Enter');
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'final-4-enter-fallback.png', fullPage: true });
    }
    
    // PASO 3: Verificar campo modelo habilitado
    console.log('\n🚙 PASO 3: VERIFICANDO CAMPO MODELO');
    
    const modelInput = page.locator('input[placeholder="Primero selecciona una marca"]');
    
    // Verificar si se habilitó
    const modelEnabled = await modelInput.isEnabled().catch(() => false);
    console.log(`Campo modelo habilitado: ${modelEnabled}`);
    
    if (modelEnabled) {
      console.log('✅ Campo modelo habilitado, buscando Carrera...');
      
      await modelInput.click();
      await modelInput.clear();
      await modelInput.type('Carrera', { delay: 300 });
      await page.waitForTimeout(2000);
      
      // Similar lógica para modelo
      const modelSuggestions = await page.evaluate(() => {
        const selectors = ['.dropdown-item', '[role="option"]', 'li[role="option"]'];
        let found = [];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            if (el.offsetParent !== null && el.textContent.toLowerCase().includes('carrera')) {
              found.push({
                selector,
                text: el.textContent.trim()
              });
            }
          }
        }
        return found;
      });
      
      if (modelSuggestions.length > 0) {
        console.log(`🎯 Encontradas sugerencias de modelo: ${modelSuggestions.length}`);
        
        const carreraClick = await page.evaluate((selector) => {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            if (el.textContent.toLowerCase().includes('carrera') && el.offsetParent !== null) {
              el.click();
              return { success: true, text: el.textContent.trim() };
            }
          }
          return { success: false };
        }, modelSuggestions[0].selector);
        
        console.log(`🖱️ Modelo click: ${JSON.stringify(carreraClick)}`);
        
        if (carreraClick.success) {
          console.log('✅ Modelo Carrera seleccionado!');
        }
      } else {
        console.log('⚠️ No hay sugerencias, presionando Enter...');
        await modelInput.press('Enter');
      }
      
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'final-5-model-filled.png', fullPage: true });
      
    } else {
      console.log('❌ Campo modelo sigue deshabilitado');
      console.log('💡 Esto indica que la marca no se seleccionó correctamente');
    }
    
    // PASO 4: Llenar precio
    console.log('\n💰 PASO 4: LLENANDO PRECIO');
    
    const priceInput = page.locator('input[placeholder="50000"]');
    await priceInput.click();
    await priceInput.clear();
    await priceInput.fill('120000');
    console.log('✅ Precio ingresado: $120,000');
    
    await page.screenshot({ path: 'final-6-price-filled.png', fullPage: true });
    
    // PASO 5: Verificar formulario y publicar
    console.log('\n🚀 PASO 5: INTENTANDO PUBLICAR');
    
    // Buscar botón de publicar
    const publishButton = page.locator('button').filter({ hasText: /publicar|enviar/i }).first();
    
    if (await publishButton.isVisible()) {
      const isEnabled = await publishButton.isEnabled();
      console.log(`Botón publicar - Visible: true, Habilitado: ${isEnabled}`);
      
      if (isEnabled) {
        console.log('🖱️ Haciendo click en publicar...');
        await publishButton.click();
        await page.waitForTimeout(5000);
        
        console.log('📍 URL después de publicar:', page.url());
        
        await page.screenshot({ path: 'final-7-after-publish.png', fullPage: true });
        
        // Ir a mis autos para verificar
        console.log('\n👁️ VERIFICANDO MIS AUTOS');
        await page.goto('http://localhost:4200/cars/my');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        const pageContent = await page.textContent('body');
        const hasPorsche = pageContent.toLowerCase().includes('porsche');
        const hasCarrera = pageContent.toLowerCase().includes('carrera');
        const hasBorrador = pageContent.toLowerCase().includes('borrador');
        
        console.log(`🔍 En mis autos:`);
        console.log(`   - Contiene "Porsche": ${hasPorsche}`);
        console.log(`   - Contiene "Carrera": ${hasCarrera}`);
        console.log(`   - Contiene "Borrador": ${hasBorrador}`);
        
        await page.screenshot({ path: 'final-8-my-cars.png', fullPage: true });
        
      } else {
        console.log('❌ Botón publicar deshabilitado - formulario incompleto');
      }
    } else {
      console.log('❌ Botón publicar no encontrado');
    }
    
    console.log('\n🎯 ¡PROCESO COMPLETADO!');
    console.log('\n📸 Screenshots generados:');
    console.log('- final-1-publish-page.png');
    console.log('- final-2-typing-por.png');
    console.log('- final-3-porsche-typed.png');  
    console.log('- final-4-porsche-selected.png');
    console.log('- final-5-model-filled.png');
    console.log('- final-6-price-filled.png');
    console.log('- final-7-after-publish.png');
    console.log('- final-8-my-cars.png');
    
  } catch (error) {
    console.error('💥 Error:', error.message);
    await page.screenshot({ path: 'final-error.png', fullPage: true });
  }
  
  console.log('\n⏸️ Browser abierto para inspección...');
}

finalDebug();