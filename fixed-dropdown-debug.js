#!/usr/bin/env node

const { chromium } = require('playwright');

async function fixedDropdownDebug() {
  console.log('🔧 FIXED DEBUG: Selección correcta de dropdown\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 800  // Más lento para ver mejor
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capturar logs importantes
  page.on('console', (msg) => {
    if (msg.type() === 'log' && msg.text().includes('PublishCarV2')) {
      console.log(`[APP LOG]: ${msg.text()}`);
    }
  });

  try {
    // PASO 1: Login rápido
    console.log('🔐 Login...');
    await page.goto('http://localhost:4200/auth/login');
    await page.fill('input[name="email"]', 'Ecucondor@gmail.com');
    await page.fill('input[name="password"]', 'Ab.12345');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    console.log('✅ Login OK\n');

    // PASO 2: Ir a publicar
    console.log('🚗 Navegando a publicar...');
    await page.goto('http://localhost:4200/cars/publish');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    console.log('✅ En página de publicar\n');

    // PASO 3: Analizar el dropdown de marca
    console.log('🔍 PASO 3: Analizando dropdown de marca...');
    
    const brandInputInfo = await page.evaluate(() => {
      const brandInput = document.querySelector('input[placeholder*="marca"]');
      if (!brandInput) return { found: false };
      
      return {
        found: true,
        placeholder: brandInput.placeholder,
        value: brandInput.value,
        id: brandInput.id,
        className: brandInput.className,
        parentElement: brandInput.parentElement.outerHTML.substring(0, 200),
        hasAutocomplete: brandInput.hasAttribute('autocomplete'),
        hasDatalist: !!document.querySelector(`datalist[id="${brandInput.getAttribute('list')}"]`)
      };
    });
    
    console.log('📋 Info del campo marca:', JSON.stringify(brandInputInfo, null, 2));
    
    await page.screenshot({ path: 'fixed-step1-initial.png', fullPage: true });

    // PASO 4: Escribir en el campo marca y esperar dropdown
    console.log('\n📝 PASO 4: Escribiendo "Porsche" y esperando dropdown...');
    
    const brandInput = page.locator('input[placeholder*="marca"]');
    await brandInput.focus();
    await brandInput.clear();
    
    // Escribir letra por letra para activar el autocomplete
    await brandInput.type('Por', { delay: 200 });
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: 'fixed-step2-typing-por.png', fullPage: true });
    
    // Continuar escribiendo
    await brandInput.type('sche', { delay: 200 });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'fixed-step3-typed-porsche.png', fullPage: true });
    
    // PASO 5: Buscar y hacer click en las opciones del dropdown
    console.log('\n🎯 PASO 5: Buscando opciones del dropdown...');
    
    const dropdownOptions = await page.evaluate(() => {
      // Buscar diferentes tipos de dropdowns/sugerencias
      const selectors = [
        '.dropdown-item',
        '.suggestion-item', 
        '.autocomplete-item',
        'ion-item',
        '[role="option"]',
        '.option',
        'li[data-value]',
        'div[data-value]',
        '.mat-option',
        '.ng-option'
      ];
      
      let options = [];
      
      for (const selector of selectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        const visibleElements = elements.filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
        });
        
        if (visibleElements.length > 0) {
          options = options.concat(visibleElements.map(el => ({
            selector,
            text: el.textContent?.trim(),
            innerHTML: el.innerHTML.substring(0, 100),
            hasPorsche: el.textContent?.toLowerCase().includes('porsche'),
            clickable: el.style.pointerEvents !== 'none'
          })));
        }
      }
      
      return options;
    });
    
    console.log(`📋 Opciones encontradas: ${dropdownOptions.length}`);
    dropdownOptions.forEach((opt, i) => {
      console.log(`  ${i + 1}. [${opt.selector}] "${opt.text}" - Porsche: ${opt.hasPorsche}`);
    });
    
    // Buscar específicamente la opción de Porsche
    const porscheOption = dropdownOptions.find(opt => opt.hasPorsche);
    
    if (porscheOption) {
      console.log(`\n🎯 ¡Encontrada opción Porsche! Selector: ${porscheOption.selector}`);
      
      // Hacer click en la opción de Porsche
      const clicked = await page.evaluate((selector, text) => {
        const elements = Array.from(document.querySelectorAll(selector));
        const porscheEl = elements.find(el => 
          el.textContent?.toLowerCase().includes('porsche') && 
          el.offsetParent !== null
        );
        
        if (porscheEl) {
          porscheEl.click();
          return { success: true, text: porscheEl.textContent.trim() };
        }
        return { success: false, reason: 'No se encontró elemento clicable' };
      }, porscheOption.selector, porscheOption.text);
      
      console.log(`🖱️ Resultado del click: ${JSON.stringify(clicked)}`);
      
      if (clicked.success) {
        await page.waitForTimeout(2000); // Esperar a que se procese la selección
        
        await page.screenshot({ path: 'fixed-step4-porsche-selected.png', fullPage: true });
        
        // PASO 6: Verificar que se habilitó el campo modelo
        console.log('\n🚙 PASO 6: Verificando campo modelo...');
        
        const modelFieldStatus = await page.evaluate(() => {
          const modelInputs = [
            ...document.querySelectorAll('input[placeholder*="modelo"]'),
            ...document.querySelectorAll('input[name*="model"]'),
            ...document.querySelectorAll('select[name*="model"]')
          ];
          
          return modelInputs.map(input => ({
            tagName: input.tagName.toLowerCase(),
            placeholder: input.placeholder,
            disabled: input.disabled,
            value: input.value,
            visible: input.offsetParent !== null
          }));
        });
        
        console.log('📋 Estado campos modelo:', JSON.stringify(modelFieldStatus, null, 2));
        
        // Intentar seleccionar modelo si está habilitado
        const enabledModelField = modelFieldStatus.find(field => !field.disabled && field.visible);
        
        if (enabledModelField) {
          console.log('\n✏️ PASO 7: Seleccionando modelo Carrera...');
          
          const modelInput = page.locator('input[placeholder*="modelo"], input[name*="model"]').first();
          await modelInput.focus();
          await modelInput.clear();
          await modelInput.type('Carrera', { delay: 200 });
          await page.waitForTimeout(1000);
          
          // Buscar opciones de modelo
          const modelOptions = await page.evaluate(() => {
            const selectors = ['.dropdown-item', 'ion-item', '[role="option"]'];
            let options = [];
            
            for (const selector of selectors) {
              const elements = Array.from(document.querySelectorAll(selector));
              const visibleElements = elements.filter(el => 
                el.offsetParent !== null && 
                el.textContent?.toLowerCase().includes('carrera')
              );
              
              if (visibleElements.length > 0) {
                return visibleElements.map(el => ({
                  selector,
                  text: el.textContent?.trim()
                }));
              }
            }
            return [];
          });
          
          console.log(`🎯 Opciones de modelo encontradas: ${modelOptions.length}`);
          
          if (modelOptions.length > 0) {
            const carreraOption = modelOptions[0];
            await page.click(`${carreraOption.selector}:has-text("${carreraOption.text}")`);
            console.log(`✅ Seleccionado: ${carreraOption.text}`);
          }
          
          await page.screenshot({ path: 'fixed-step5-model-selected.png', fullPage: true });
        }
        
        // PASO 8: Llenar precio y otros campos
        console.log('\n💰 PASO 8: Llenando precio...');
        
        const priceInput = page.locator('input[type="number"], input[placeholder*="precio"]').first();
        if (await priceInput.isVisible()) {
          await priceInput.fill('120000');
          console.log('✅ Precio: $120,000');
        }
        
        await page.screenshot({ path: 'fixed-step6-price-filled.png', fullPage: true });
        
        // PASO 9: Intentar publicar
        console.log('\n🚀 PASO 9: Buscando botón publicar...');
        
        const publishButtons = await page.locator('button').all();
        const publishButtonTexts = await Promise.all(
          publishButtons.map(async (btn) => ({
            text: await btn.textContent(),
            disabled: await btn.isDisabled(),
            visible: await btn.isVisible()
          }))
        );
        
        console.log('📋 Botones encontrados:');
        publishButtonTexts.forEach((btn, i) => {
          console.log(`  ${i + 1}. "${btn.text?.trim()}" - Disabled: ${btn.disabled} - Visible: ${btn.visible}`);
        });
        
        const publishBtn = page.locator('button').filter({ hasText: /publicar|enviar/i }).first();
        if (await publishBtn.isVisible()) {
          console.log('🖱️ Haciendo click en publicar...');
          await publishBtn.click();
          await page.waitForTimeout(3000);
          
          console.log('📍 URL después de publicar:', page.url());
          await page.screenshot({ path: 'fixed-step7-after-publish.png', fullPage: true });
        }
        
        console.log('\n🎯 ¡DEBUG COMPLETADO CON SELECCIÓN CORRECTA!');
        
      } else {
        console.log('❌ No se pudo hacer click en la opción de Porsche');
      }
      
    } else {
      console.log('\n❌ No se encontró opción de Porsche en el dropdown');
      console.log('💡 Puede que necesite más tiempo o un enfoque diferente');
      
      // Intentar presionar Enter o flecha abajo
      await brandInput.press('ArrowDown');
      await page.waitForTimeout(500);
      await brandInput.press('Enter');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'fixed-step4-arrow-enter.png', fullPage: true });
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
    await page.screenshot({ path: 'fixed-error.png', fullPage: true });
  }
  
  console.log('\n📋 Screenshots generados:');
  console.log('- fixed-step1-initial.png');
  console.log('- fixed-step2-typing-por.png');  
  console.log('- fixed-step3-typed-porsche.png');
  console.log('- fixed-step4-porsche-selected.png');
  console.log('- fixed-step5-model-selected.png');
  console.log('- fixed-step6-price-filled.png');
  console.log('- fixed-step7-after-publish.png');
  
  console.log('\n⏸️ Browser abierto para inspección...');
}

fixedDropdownDebug();