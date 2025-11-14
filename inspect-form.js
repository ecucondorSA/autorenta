#!/usr/bin/env node

const { chromium } = require('playwright');

async function inspectForm() {
  console.log('🔍 INSPECTOR: Encontrando campos exactos del formulario\n');
  
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login rápido
    console.log('🔐 Login...');
    await page.goto('http://localhost:4200/auth/login');
    await page.fill('input[name="email"]', 'Ecucondor@gmail.com');
    await page.fill('input[name="password"]', 'Ab.12345');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Ir a publicar
    await page.goto('http://localhost:4200/cars/publish');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('🔍 INSPECCIONANDO TODOS LOS CAMPOS...\n');
    
    // Capturar TODOS los elementos de input
    const allFormElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('input, select, textarea, ion-input, ion-select, ion-textarea');
      
      return Array.from(elements).map((el, index) => {
        const rect = el.getBoundingClientRect();
        
        return {
          index,
          tagName: el.tagName.toLowerCase(),
          type: el.type || el.getAttribute('type') || 'no-type',
          name: el.name || el.getAttribute('name') || 'no-name', 
          id: el.id || 'no-id',
          className: el.className || 'no-class',
          placeholder: el.placeholder || el.getAttribute('placeholder') || 'no-placeholder',
          value: el.value || 'no-value',
          disabled: el.disabled,
          required: el.required || el.hasAttribute('required'),
          visible: rect.width > 0 && rect.height > 0 && el.offsetParent !== null,
          position: `${Math.round(rect.x)},${Math.round(rect.y)}`,
          size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
          innerHTML: el.innerHTML ? el.innerHTML.substring(0, 50) + '...' : 'no-innerHTML'
        };
      });
    });
    
    console.log(`📋 TOTAL DE ELEMENTOS ENCONTRADOS: ${allFormElements.length}\n`);
    
    // Mostrar elementos visibles
    const visibleElements = allFormElements.filter(el => el.visible);
    console.log(`👁️ ELEMENTOS VISIBLES: ${visibleElements.length}\n`);
    
    visibleElements.forEach(el => {
      console.log(`${el.index + 1}. ${el.tagName.toUpperCase()}`);
      console.log(`   Type: "${el.type}"`);
      console.log(`   Name: "${el.name}"`);
      console.log(`   ID: "${el.id}"`);
      console.log(`   Placeholder: "${el.placeholder}"`);
      console.log(`   Class: "${el.className.substring(0, 50)}..."`);
      console.log(`   Value: "${el.value}"`);
      console.log(`   Disabled: ${el.disabled}`);
      console.log(`   Required: ${el.required}`);
      console.log(`   Position: ${el.position}`);
      console.log(`   Size: ${el.size}`);
      console.log(`   Content: "${el.innerHTML}"`);
      console.log('   ────────────────────────');
    });
    
    // Buscar específicamente campos relacionados con autos
    console.log('\n🚗 CAMPOS RELACIONADOS CON AUTOS:\n');
    
    const autoRelatedFields = visibleElements.filter(el => {
      const searchText = `${el.name} ${el.placeholder} ${el.className} ${el.id}`.toLowerCase();
      return searchText.includes('brand') || 
             searchText.includes('marca') || 
             searchText.includes('model') || 
             searchText.includes('modelo') || 
             searchText.includes('price') || 
             searchText.includes('precio') ||
             searchText.includes('year') ||
             searchText.includes('año');
    });
    
    autoRelatedFields.forEach((el, i) => {
      console.log(`AUTO-${i + 1}. ${el.tagName.toUpperCase()} - "${el.placeholder}"`);
      console.log(`   Selector sugerido: ${el.tagName}[placeholder="${el.placeholder}"]`);
      console.log(`   O por name: ${el.tagName}[name="${el.name}"]`);
      console.log(`   O por ID: #${el.id}`);
      console.log('');
    });
    
    await page.screenshot({ path: 'inspect-form.png', fullPage: true });
    console.log('📸 Screenshot: inspect-form.png');
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
  
  console.log('\n⏸️ Inspección completada. Presiona Ctrl+C para cerrar.');
}

inspectForm();