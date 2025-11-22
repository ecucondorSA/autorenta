const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capturar TODOS los errores
  const errors = [];
  const warnings = [];
  
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    if (type === 'error') {
      errors.push(text);
      console.error('❌ Console Error:', text);
    } else if (type === 'warning') {
      warnings.push(text);
      console.warn('⚠️  Warning:', text);
    } else if (text.includes('Mapa') || text.includes('Mapbox') || text.includes('marker')) {
      console.log(`[${type}]`, text);
    }
  });
  
  page.on('pageerror', error => {
    console.error('❌ Page Error:', error.message);
    errors.push(error.message);
  });
  
  page.on('requestfailed', request => {
    console.error('❌ Request Failed:', request.url());
  });
  
  console.log('🌐 Navegando...\n');
  await page.goto('https://2526cd99.autorenta-web.pages.dev/cars/list', { 
    waitUntil: 'networkidle',
    timeout: 30000 
  });
  
  console.log('\n⏳ Esperando 10 segundos...\n');
  await page.waitForTimeout(10000);
  
  console.log('\n📊 RESUMEN:');
  console.log('='.repeat(60));
  console.log(`Total errores: ${errors.length}`);
  console.log(`Total warnings: ${warnings.length}`);
  
  if (errors.length > 0) {
    console.log('\n🔴 ERRORES ENCONTRADOS:');
    errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
  }
  
  await browser.close();
})();
