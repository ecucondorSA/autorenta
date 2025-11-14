#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');

async function ultimateDebug() {
  console.log('🔬 ULTIMATE DEBUG: Capturando TODO con Playwright\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  const context = await browser.newContext({
    recordVideo: { dir: 'debug-videos/' },
    recordHar: { path: 'debug-network.har' }
  });
  
  const page = await context.newPage();

  // Arrays para capturar logs
  const consoleLogs = [];
  const networkRequests = [];
  const networkResponses = [];
  const jsErrors = [];
  const pageEvents = [];

  // 🖥️ CAPTURAR CONSOLE LOGS
  page.on('console', (msg) => {
    const logEntry = {
      type: msg.type(),
      text: msg.text(),
      args: msg.args(),
      location: msg.location(),
      timestamp: new Date().toISOString()
    };
    consoleLogs.push(logEntry);
    console.log(`[CONSOLE ${msg.type().toUpperCase()}]: ${msg.text()}`);
  });

  // 🌐 CAPTURAR NETWORK REQUESTS
  page.on('request', (request) => {
    const reqData = {
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData(),
      timestamp: new Date().toISOString(),
      resourceType: request.resourceType()
    };
    networkRequests.push(reqData);
    
    if (request.method() === 'POST') {
      console.log(`🌐 POST Request: ${request.url()}`);
      if (request.postData()) {
        console.log(`   Data: ${request.postData().substring(0, 200)}...`);
      }
    }
  });

  // 📡 CAPTURAR NETWORK RESPONSES
  page.on('response', (response) => {
    const resData = {
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers(),
      timestamp: new Date().toISOString(),
      ok: response.ok()
    };
    networkResponses.push(resData);
    
    if (!response.ok()) {
      console.log(`❌ Failed Request: ${response.status()} - ${response.url()}`);
    }
    
    // Capturar respuestas de APIs importantes
    if (response.url().includes('/cars') || response.url().includes('/api/')) {
      console.log(`📡 API Response: ${response.status()} - ${response.url()}`);
    }
  });

  // 💥 CAPTURAR JS ERRORS
  page.on('pageerror', (error) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    };
    jsErrors.push(errorData);
    console.log(`💥 JS Error: ${error.message}`);
  });

  // 📊 FUNCIÓN PARA CAPTURAR ESTADO DE LA PÁGINA
  async function capturePageState(stepName) {
    const state = {
      step: stepName,
      timestamp: new Date().toISOString(),
      url: page.url(),
      title: await page.title(),
      cookies: await context.cookies(),
      localStorage: await page.evaluate(() => {
        const storage = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          storage[key] = localStorage.getItem(key);
        }
        return storage;
      }),
      sessionStorage: await page.evaluate(() => {
        const storage = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          storage[key] = sessionStorage.getItem(key);
        }
        return storage;
      }),
      // Performance metrics
      performance: await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0];
        return {
          loadTime: perf?.loadEventEnd - perf?.loadEventStart,
          domContentLoaded: perf?.domContentLoadedEventEnd - perf?.domContentLoadedEventStart,
          networkTime: perf?.responseEnd - perf?.requestStart
        };
      })
    };
    
    pageEvents.push(state);
    return state;
  }

  // 🔍 FUNCIÓN PARA ANALIZAR FORMULARIO
  async function analyzeForm() {
    console.log('\n🔍 ANALIZANDO FORMULARIO DETALLADAMENTE...');
    
    const formAnalysis = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const inputs = Array.from(document.querySelectorAll('input, select, textarea, ion-input, ion-select'));
      
      return {
        formsCount: forms.length,
        inputsCount: inputs.length,
        forms: forms.map((form, i) => ({
          index: i,
          action: form.action,
          method: form.method,
          id: form.id,
          className: form.className,
          innerHTML: form.innerHTML.substring(0, 300)
        })),
        inputs: inputs.map((input, i) => ({
          index: i,
          tagName: input.tagName.toLowerCase(),
          type: input.type || input.getAttribute('type'),
          name: input.name || input.getAttribute('name'),
          id: input.id,
          placeholder: input.placeholder || input.getAttribute('placeholder'),
          required: input.required || input.hasAttribute('required'),
          value: input.value,
          disabled: input.disabled,
          className: input.className,
          visible: input.offsetParent !== null
        }))
      };
    });
    
    console.log(`📋 Formularios encontrados: ${formAnalysis.formsCount}`);
    console.log(`📝 Campos encontrados: ${formAnalysis.inputsCount}`);
    
    // Mostrar campos importantes
    const importantFields = formAnalysis.inputs.filter(input => 
      input.name?.includes('brand') || 
      input.name?.includes('model') || 
      input.name?.includes('price') ||
      input.placeholder?.toLowerCase().includes('marca') ||
      input.placeholder?.toLowerCase().includes('modelo') ||
      input.placeholder?.toLowerCase().includes('precio')
    );
    
    console.log('\n📋 Campos importantes del auto:');
    importantFields.forEach((field, i) => {
      console.log(`  ${i + 1}. ${field.tagName} - ${field.name} - "${field.placeholder}" - Required: ${field.required} - Visible: ${field.visible}`);
    });
    
    return formAnalysis;
  }

  try {
    // PASO 1: LOGIN
    console.log('🔐 PASO 1: LOGIN');
    await page.goto('http://localhost:4200/auth/login');
    await page.waitForLoadState('networkidle');
    
    await capturePageState('login-page');
    
    // Login
    await page.fill('input[name="email"]', 'Ecucondor@gmail.com');
    await page.fill('input[name="password"]', 'Ab.12345');
    await page.click('button[type="submit"]');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    await capturePageState('after-login');
    console.log('✅ Login completado\n');

    // PASO 2: PUBLICAR AUTO
    console.log('🚗 PASO 2: NAVEGANDO A PUBLICAR');
    await page.goto('http://localhost:4200/cars/publish');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);  // Esperar a que cargue completamente
    
    await capturePageState('publish-page');
    
    // Analizar formulario
    const formData = await analyzeForm();
    
    // Capturar screenshot de página completa
    await page.screenshot({ path: 'ultimate-debug-publish-form.png', fullPage: true });
    
    // PASO 3: LLENAR FORMULARIO
    console.log('\n📝 PASO 3: LLENANDO FORMULARIO');
    
    // Buscar y llenar marca
    const brandFilled = await page.evaluate(() => {
      const brandInputs = [
        ...document.querySelectorAll('input[name*="brand"], input[placeholder*="marca" i]'),
        ...document.querySelectorAll('select[name*="brand"]'),
        ...document.querySelectorAll('ion-input[name*="brand"] input'),
        ...document.querySelectorAll('ion-select[name*="brand"]')
      ];
      
      for (const input of brandInputs) {
        if (input.offsetParent !== null) { // visible
          if (input.tagName.toLowerCase() === 'input') {
            input.value = 'Porsche';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true, element: input.name || input.placeholder, method: 'input' };
          }
        }
      }
      return { success: false, reason: 'No encontró campo de marca visible' };
    });
    
    console.log(`🏷️  Marca: ${JSON.stringify(brandFilled)}`);
    await page.waitForTimeout(2000);
    
    // Modelo
    const modelFilled = await page.evaluate(() => {
      const modelInputs = [
        ...document.querySelectorAll('input[name*="model"], input[placeholder*="modelo" i]'),
        ...document.querySelectorAll('select[name*="model"]'),
        ...document.querySelectorAll('ion-input[name*="model"] input')
      ];
      
      for (const input of modelInputs) {
        if (input.offsetParent !== null && !input.disabled) {
          if (input.tagName.toLowerCase() === 'input') {
            input.value = 'Carrera';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true, element: input.name || input.placeholder, method: 'input' };
          }
        }
      }
      return { success: false, reason: 'No encontró campo de modelo visible/habilitado' };
    });
    
    console.log(`🚙 Modelo: ${JSON.stringify(modelFilled)}`);
    await page.waitForTimeout(1000);
    
    // Precio
    const priceFilled = await page.evaluate(() => {
      const priceInputs = [
        ...document.querySelectorAll('input[name*="price"], input[placeholder*="precio" i]'),
        ...document.querySelectorAll('input[type="number"]'),
        ...document.querySelectorAll('ion-input[name*="price"] input')
      ];
      
      for (const input of priceInputs) {
        if (input.offsetParent !== null && !input.disabled) {
          input.value = '120000';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true, element: input.name || input.placeholder, method: 'input' };
        }
      }
      return { success: false, reason: 'No encontró campo de precio visible/habilitado' };
    });
    
    console.log(`💰 Precio: ${JSON.stringify(priceFilled)}`);
    
    await capturePageState('form-filled');
    await page.screenshot({ path: 'ultimate-debug-form-filled.png', fullPage: true });
    
    // PASO 4: VALIDAR FORMULARIO
    console.log('\n✅ PASO 4: VALIDANDO FORMULARIO');
    
    const validationErrors = await page.evaluate(() => {
      const errors = [];
      
      // Buscar mensajes de error visibles
      const errorElements = document.querySelectorAll('.error, .invalid, .ng-invalid, [class*="error"], .form-error');
      errorElements.forEach(el => {
        if (el.offsetParent !== null && el.textContent.trim()) {
          errors.push({
            type: 'validation-message',
            text: el.textContent.trim(),
            className: el.className
          });
        }
      });
      
      // Verificar campos requeridos
      const requiredFields = document.querySelectorAll('input[required], select[required], textarea[required]');
      requiredFields.forEach(field => {
        if (!field.value && field.offsetParent !== null) {
          errors.push({
            type: 'required-field-empty',
            name: field.name,
            placeholder: field.placeholder
          });
        }
      });
      
      return errors;
    });
    
    if (validationErrors.length > 0) {
      console.log('⚠️ Errores de validación encontrados:');
      validationErrors.forEach(error => {
        console.log(`   - ${error.type}: ${error.text || error.name}`);
      });
    } else {
      console.log('✅ No se encontraron errores de validación');
    }
    
    // PASO 5: PUBLICAR
    console.log('\n🚀 PASO 5: PUBLICANDO AUTO');
    
    const publishResult = await page.evaluate(() => {
      const publishButtons = [
        ...document.querySelectorAll('button[type="submit"]'),
        ...document.querySelectorAll('button:has-text("Publicar")'),
        ...document.querySelectorAll('button:has-text("Enviar")'),
        ...document.querySelectorAll('ion-button[type="submit"]')
      ];
      
      for (const button of publishButtons) {
        if (button.offsetParent !== null && !button.disabled) {
          button.click();
          return {
            success: true,
            buttonText: button.textContent.trim(),
            buttonType: button.type,
            disabled: button.disabled
          };
        }
      }
      
      return { success: false, reason: 'No se encontró botón de publicar habilitado' };
    });
    
    console.log(`📤 Resultado del click: ${JSON.stringify(publishResult)}`);
    
    // Esperar respuesta
    await page.waitForTimeout(5000);
    
    await capturePageState('after-publish');
    await page.screenshot({ path: 'ultimate-debug-after-publish.png', fullPage: true });
    
    // PASO 6: VERIFICAR MIS AUTOS
    console.log('\n👁️ PASO 6: VERIFICANDO MIS AUTOS');
    await page.goto('http://localhost:4200/cars/my');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const myCars = await page.evaluate(() => {
      const carElements = document.querySelectorAll('.car-card, .auto-item, [class*="car"], .vehicle-card');
      const pageText = document.body.textContent.toLowerCase();
      
      return {
        carCount: carElements.length,
        hasPorsche: pageText.includes('porsche'),
        hasCarrera: pageText.includes('carrera'),
        hasBorrador: pageText.includes('borrador'),
        hasPendiente: pageText.includes('pendiente'),
        carElements: Array.from(carElements).map(el => ({
          text: el.textContent.trim().substring(0, 100),
          className: el.className
        }))
      };
    });
    
    console.log(`🚗 Resultados en mis autos:`);
    console.log(`   - Elementos encontrados: ${myCars.carCount}`);
    console.log(`   - Contiene "Porsche": ${myCars.hasPorsche}`);
    console.log(`   - Contiene "Carrera": ${myCars.hasCarrera}`);
    console.log(`   - Contiene "Borrador": ${myCars.hasBorrador}`);
    
    await capturePageState('my-cars');
    await page.screenshot({ path: 'ultimate-debug-my-cars.png', fullPage: true });
    
    // GENERAR REPORTE
    const report = {
      timestamp: new Date().toISOString(),
      consoleLogs,
      networkRequests: networkRequests.filter(req => req.url.includes('/cars') || req.url.includes('/api/')),
      networkResponses: networkResponses.filter(res => res.url.includes('/cars') || res.url.includes('/api/')),
      jsErrors,
      pageEvents,
      formAnalysis: formData,
      validationErrors,
      publishResult,
      myCarsResult: myCars
    };
    
    fs.writeFileSync('ultimate-debug-report.json', JSON.stringify(report, null, 2));
    
    console.log('\n🎯 DEBUG COMPLETADO!');
    console.log('\n📋 Archivos generados:');
    console.log('- ultimate-debug-report.json (Reporte completo)');
    console.log('- ultimate-debug-*.png (Screenshots)');
    console.log('- debug-network.har (Network HAR file)');
    console.log('- debug-videos/ (Video recording)');
    
    console.log('\n📊 RESUMEN RÁPIDO:');
    console.log(`   Console Logs: ${consoleLogs.length}`);
    console.log(`   Network Requests: ${networkRequests.length}`);
    console.log(`   JS Errors: ${jsErrors.length}`);
    console.log(`   Validation Errors: ${validationErrors.length}`);
    console.log(`   Publish Success: ${publishResult.success}`);
    console.log(`   Cars Found: ${myCars.carCount}`);
    
  } catch (error) {
    console.error('💥 Error durante el debug:', error);
    await page.screenshot({ path: 'ultimate-debug-error.png', fullPage: true });
  }
  
  console.log('\n⏸️ Browser abierto para inspección. Presiona Ctrl+C para cerrar.');
}

ultimateDebug();