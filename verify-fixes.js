const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const warnings = [];
  const errors = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('NO region_id')) {
      warnings.push(text);
    }
  });
  
  page.on('pageerror', err => {
    errors.push(err.message);
  });
  
  console.log('🔍 Verificando fixes en nuevo deployment...\n');
  console.log('URL: https://28150684.autorenta-web.pages.dev\n');
  
  await page.goto('https://28150684.autorenta-web.pages.dev', { 
    waitUntil: 'networkidle',
    timeout: 30000 
  });
  
  await page.waitForTimeout(5000);
  
  console.log('✅ Página cargada\n');
  
  // Verificar headers
  const response = await page.goto('https://28150684.autorenta-web.pages.dev');
  const headers = response.headers();
  
  console.log('📋 Headers de seguridad:');
  console.log('  Permissions-Policy:', headers['permissions-policy'] || 'NO CONFIGURADO');
  console.log('  X-Frame-Options:', headers['x-frame-options'] || 'NO CONFIGURADO');
  console.log('  X-Content-Type-Options:', headers['x-content-type-options'] || 'NO CONFIGURADO');
  
  await page.waitForTimeout(3000);
  
  console.log('\n⚠️  Advertencias de autos sin region_id:', warnings.length);
  if (warnings.length > 0) {
    console.log('  ❌ Todavía hay autos sin region_id:');
    warnings.forEach(w => console.log('    -', w));
  } else {
    console.log('  ✅ Todos los autos tienen region_id');
  }
  
  console.log('\n❌ Errores JavaScript:', errors.length);
  if (errors.length > 0) {
    errors.forEach(e => console.log('  -', e));
  }
  
  await page.screenshot({ path: 'deployment-verified.png', fullPage: true });
  console.log('\n📸 Screenshot: deployment-verified.png');
  
  await browser.close();
})();
