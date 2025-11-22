const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const errors = [];
  const logs = [];
  
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (text.includes('Error') || text.includes('deleting')) {
      console.log(`[CONSOLE] ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    console.error('❌ PAGE ERROR:', error.message);
    errors.push(error.message);
  });
  
  console.log('🔍 Abriendo localhost:4200/cars/my...\n');
  
  await page.goto('http://localhost:4200/cars/my', { 
    waitUntil: 'networkidle',
    timeout: 30000 
  });
  
  console.log('✅ Página cargada');
  console.log('URL:', page.url());
  
  await page.waitForTimeout(3000);
  
  // Verificar si hay botones de eliminar
  const deleteButtons = await page.$$('[aria-label*="eliminar"], button:has-text("Eliminar"), button:has-text("🗑️")');
  console.log(`\n🔍 Botones de eliminar encontrados: ${deleteButtons.length}`);
  
  if (deleteButtons.length === 0) {
    console.log('⚠️  No hay botones de eliminar visibles');
    console.log('   Puede ser que no hay autos o que el usuario no está logueado\n');
  }
  
  // Esperar 30 segundos para que puedas probar manualmente
  console.log('\n⏳ Esperando 30 segundos...');
  console.log('   Prueba hacer click en eliminar y observa los logs\n');
  
  await page.waitForTimeout(30000);
  
  console.log('\n📊 Logs capturados:', logs.length);
  console.log('❌ Errores capturados:', errors.length);
  
  if (errors.length > 0) {
    console.log('\nErrores:');
    errors.forEach(e => console.log('  -', e));
  }
  
  await browser.close();
})();
