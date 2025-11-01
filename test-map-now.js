const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Iniciando test del mapa...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capturar logs de consola
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (text.includes('🔥') || text.includes('📍') || text.includes('🚗') || text.includes('✅') || text.includes('❌')) {
      console.log(`  ${text}`);
    }
  });
  
  console.log('🌐 Navegando a la app...');
  await page.goto('https://5c5d15ee.autorenta-web.pages.dev/cars/list', { 
    waitUntil: 'networkidle',
    timeout: 30000 
  });
  
  console.log('⏳ Esperando a que cargue el mapa (8 segundos)...\n');
  await page.waitForTimeout(8000);
  
  // 1. Verificar error overlay
  console.log('🔍 Verificando errores...');
  const errorOverlay = await page.locator('.error-overlay').isVisible().catch(() => false);
  if (errorOverlay) {
    const errorMsg = await page.locator('.error-message').textContent().catch(() => 'Sin mensaje');
    console.log(`   ❌ ERROR: ${errorMsg}\n`);
  } else {
    console.log('   ✅ No hay errores\n');
  }
  
  // 2. Verificar loading
  const loadingOverlay = await page.locator('.loading-overlay').isVisible().catch(() => false);
  if (loadingOverlay) {
    console.log('   ⏳ Todavía cargando...\n');
  }
  
  // 3. Verificar canvas del mapa
  console.log('🗺️  Verificando canvas del mapa...');
  const mapCanvas = await page.locator('.mapboxgl-canvas').first();
  const hasCanvas = await mapCanvas.isVisible().catch(() => false);
  if (hasCanvas) {
    const box = await mapCanvas.boundingBox();
    console.log(`   ✅ Canvas visible: ${box.width}x${box.height}px\n`);
  } else {
    console.log('   ❌ Canvas no encontrado\n');
  }
  
  // 4. Contar markers
  console.log('📍 Contando markers...');
  const photoMarkers = await page.locator('.car-marker-photo').count();
  const mapboxMarkers = await page.locator('.mapboxgl-marker').count();
  
  console.log(`   • Markers con foto (.car-marker-photo): ${photoMarkers}`);
  console.log(`   • Markers de Mapbox (.mapboxgl-marker): ${mapboxMarkers}\n`);
  
  if (photoMarkers > 0) {
    console.log('✅ ¡HAY MARKERS CON FOTO!\n');
    
    // Obtener info de los primeros 3 markers
    console.log('🚗 Información de markers:\n');
    for (let i = 0; i < Math.min(3, photoMarkers); i++) {
      const marker = page.locator('.car-marker-photo').nth(i);
      const isVisible = await marker.isVisible();
      const html = await marker.innerHTML().catch(() => 'Error al obtener HTML');
      
      console.log(`   Marker ${i + 1}:`);
      console.log(`     Visible: ${isVisible ? '✅' : '❌'}`);
      
      // Extraer precio del HTML
      const priceMatch = html.match(/<div class="marker-price">([^<]+)<\/div>/);
      if (priceMatch) {
        console.log(`     Precio: ${priceMatch[1]}`);
      }
      
      // Verificar si tiene imagen
      const hasImage = html.includes('background-image');
      console.log(`     Tiene imagen: ${hasImage ? '✅' : '❌'}`);
      console.log('');
    }
  } else {
    console.log('❌ NO HAY MARKERS VISIBLES\n');
  }
  
  // 5. Verificar Mapbox
  console.log('🔐 Verificando Mapbox...');
  const mapboxInfo = await page.evaluate(() => {
    return {
      loaded: typeof mapboxgl !== 'undefined',
      version: typeof mapboxgl !== 'undefined' ? mapboxgl.version : null,
      hasToken: typeof mapboxgl !== 'undefined' && mapboxgl.accessToken ? true : false
    };
  });
  
  console.log(`   Mapbox cargado: ${mapboxInfo.loaded ? '✅' : '❌'}`);
  console.log(`   Version: ${mapboxInfo.version || 'N/A'}`);
  console.log(`   Access token: ${mapboxInfo.hasToken ? '✅' : '❌'}\n`);
  
  // 6. Screenshot
  console.log('📸 Tomando screenshot...');
  await page.screenshot({ 
    path: '/home/edu/map-screenshot.png', 
    fullPage: false 
  });
  console.log('   Guardado: /home/edu/map-screenshot.png\n');
  
  // 7. Resumen de logs importantes
  console.log('📋 Logs importantes de consola:\n');
  const importantLogs = consoleLogs.filter(log => 
    log.includes('Actualizando markers') || 
    log.includes('Total markers') ||
    log.includes('MARKER DE PRUEBA') ||
    log.includes('Mapa cargado')
  );
  
  if (importantLogs.length > 0) {
    importantLogs.forEach(log => console.log(`   ${log}`));
  } else {
    console.log('   (No se encontraron logs relevantes)');
  }
  
  await browser.close();
  
  console.log('\n' + '='.repeat(60));
  console.log('RESULTADO FINAL:');
  console.log('='.repeat(60));
  if (photoMarkers > 0 && !errorOverlay) {
    console.log('✅ ¡MAPA FUNCIONANDO CORRECTAMENTE!');
    console.log(`✅ ${photoMarkers} markers con foto visible`);
  } else if (errorOverlay) {
    console.log('❌ Hay un error bloqueando el mapa');
  } else {
    console.log('⚠️  Mapa carga pero no hay markers visibles');
  }
  console.log('='.repeat(60));
})();
