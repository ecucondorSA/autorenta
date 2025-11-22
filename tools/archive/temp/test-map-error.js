const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capturar errores de consola
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.error('❌ Console Error:', text);
    } else if (text.includes('🔥') || text.includes('📍') || text.includes('❌') || text.includes('✅')) {
      console.log(`[${type}]`, text);
    }
  });
  
  // Capturar errores de página
  page.on('pageerror', error => {
    console.error('❌ Page Error:', error.message);
  });
  
  console.log('🌐 Navegando a la app...');
  await page.goto('https://9e9f2a5c.autorenta-web.pages.dev/cars/list', { 
    waitUntil: 'networkidle',
    timeout: 30000 
  });
  
  console.log('\n⏳ Esperando a que cargue el mapa...');
  await page.waitForTimeout(5000);
  
  // Verificar error overlay
  const errorOverlay = await page.locator('.error-overlay').first();
  const hasError = await errorOverlay.isVisible().catch(() => false);
  
  if (hasError) {
    console.log('\n❌ ERROR DETECTADO EN MAPA:');
    const errorMessage = await page.locator('.error-message').textContent().catch(() => 'No message');
    console.log('   Mensaje:', errorMessage);
  } else {
    console.log('\n✅ No hay error overlay visible');
  }
  
  // Verificar loading
  const loadingOverlay = await page.locator('.loading-overlay').first();
  const isLoading = await loadingOverlay.isVisible().catch(() => false);
  if (isLoading) {
    console.log('⏳ Mapa todavía cargando...');
  }
  
  // Verificar canvas del mapa
  const mapCanvas = await page.locator('.map-canvas').first();
  const hasCanvas = await mapCanvas.isVisible().catch(() => false);
  if (hasCanvas) {
    const box = await mapCanvas.boundingBox();
    console.log('✅ Canvas del mapa:', box);
  } else {
    console.log('❌ Canvas del mapa no encontrado');
  }
  
  // Verificar markers
  const markers = await page.locator('.car-marker-photo, .mapboxgl-marker').count();
  console.log(`\n📍 Markers encontrados: ${markers}`);
  
  if (markers > 0) {
    console.log('✅ Hay markers en el mapa!');
    
    // Obtener info del primer marker
    const firstMarker = await page.locator('.car-marker-photo').first();
    if (await firstMarker.isVisible()) {
      const markerHTML = await firstMarker.innerHTML();
      console.log('\n🚗 Primer marker HTML:', markerHTML.substring(0, 200) + '...');
    }
  } else {
    console.log('❌ No hay markers visibles');
  }
  
  // Ejecutar script de debug en el navegador
  const debugInfo = await page.evaluate(() => {
    const info = {
      mapboxLoaded: typeof mapboxgl !== 'undefined',
      mapboxVersion: typeof mapboxgl !== 'undefined' ? mapboxgl.version : null,
      hasAccessToken: typeof mapboxgl !== 'undefined' && mapboxgl.accessToken ? true : false,
      windowSize: { width: window.innerWidth, height: window.innerHeight }
    };
    return info;
  });
  
  console.log('\n🔍 Debug Info:');
  console.log('   Mapbox cargado:', debugInfo.mapboxLoaded);
  console.log('   Mapbox version:', debugInfo.mapboxVersion);
  console.log('   Access token:', debugInfo.hasAccessToken ? '✅ CONFIGURADO' : '❌ NO CONFIGURADO');
  console.log('   Window size:', debugInfo.windowSize);
  
  // Screenshot
  console.log('\n📸 Tomando screenshot...');
  await page.screenshot({ path: '/home/edu/map-debug.png', fullPage: true });
  console.log('   Guardado en: /home/edu/map-debug.png');
  
  await browser.close();
  console.log('\n✅ Test completado');
})();
