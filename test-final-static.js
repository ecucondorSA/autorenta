const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Iniciando diagnóstico profundo de markers...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capturar todos los logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (text.includes('📍') || text.includes('🚗') || text.includes('✅') || text.includes('❌') || text.includes('🔄')) {
      console.log(`   ${text}`);
    }
  });
  
  console.log('🌐 Navegando a la app...');
  await page.goto('https://326e5eee.autorenta-web.pages.dev/cars/list', { 
    waitUntil: 'networkidle',
    timeout: 30000 
  });
  
  console.log('⏳ Esperando carga inicial (3 seg)...\n');
  await page.waitForTimeout(3000);
  
  // Inyectar script de monitoreo
  await page.evaluate(() => {
    window.markerHistory = [];
    
    const checkMarkers = () => {
      const markers = document.querySelectorAll('.car-marker-simple, .mapboxgl-marker');
      const timestamp = new Date().toISOString().substr(17, 6);
      
      window.markerHistory.push({
        time: timestamp,
        count: markers.length,
        simple: document.querySelectorAll('.car-marker-simple').length,
        mapbox: document.querySelectorAll('.mapboxgl-marker').length
      });
    };
    
    // Check cada 200ms por 10 segundos
    window.monitorInterval = setInterval(checkMarkers, 200);
    setTimeout(() => clearInterval(window.monitorInterval), 10000);
  });
  
  console.log('🔍 Monitoreando markers por 10 segundos...\n');
  await page.waitForTimeout(10000);
  
  // Obtener historial
  const history = await page.evaluate(() => window.markerHistory);
  
  console.log('📊 ANÁLISIS DE MARKERS:\n');
  console.log('Tiempo    | Total | Simple | Mapbox | Cambio');
  console.log('-'.repeat(55));
  
  let prevCount = 0;
  history.forEach((entry, i) => {
    const change = i === 0 ? 'inicial' : 
                   entry.count > prevCount ? `+${entry.count - prevCount}` :
                   entry.count < prevCount ? `${entry.count - prevCount}` : '=';
    
    console.log(`${entry.time} | ${entry.count.toString().padStart(5)} | ${entry.simple.toString().padStart(6)} | ${entry.mapbox.toString().padStart(6)} | ${change}`);
    
    if (entry.count === 0 && prevCount > 0) {
      console.log('          ❌ TODOS ELIMINADOS');
    }
    
    prevCount = entry.count;
  });
  
  console.log('\n📈 ESTADÍSTICAS:');
  const counts = history.map(h => h.count);
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  const final = counts[counts.length - 1];
  const changes = history.filter((h, i) => i > 0 && h.count !== history[i-1].count).length;
  
  console.log(`   Máximo: ${max} markers`);
  console.log(`   Mínimo: ${min} markers`);
  console.log(`   Final: ${final} markers`);
  console.log(`   Cambios: ${changes} veces`);
  
  // Screenshot final
  await page.screenshot({ path: '/home/edu/map-final.png', fullPage: false });
  console.log('\n📸 Screenshot: /home/edu/map-final.png');
  
  // Verificar estado final del mapa
  const finalState = await page.evaluate(() => {
    return {
      hasCanvas: !!document.querySelector('.mapboxgl-canvas'),
      hasError: !!document.querySelector('.error-overlay'),
      markersSimple: document.querySelectorAll('.car-marker-simple').length,
      markersMapbox: document.querySelectorAll('.mapboxgl-marker').length,
      mapboxLoaded: typeof mapboxgl !== 'undefined',
      mapboxVersion: typeof mapboxgl !== 'undefined' ? mapboxgl.version : null
    };
  });
  
  console.log('\n📍 ESTADO FINAL:');
  console.log(`   Canvas: ${finalState.hasCanvas ? '✅' : '❌'}`);
  console.log(`   Error: ${finalState.hasError ? '❌ SÍ' : '✅ NO'}`);
  console.log(`   Markers .car-marker-simple: ${finalState.markersSimple}`);
  console.log(`   Markers .mapboxgl-marker: ${finalState.markersMapbox}`);
  console.log(`   Mapbox: ${finalState.mapboxLoaded ? '✅' : '❌'} ${finalState.mapboxVersion || ''}`);
  
  // Buscar logs importantes
  console.log('\n📋 LOGS IMPORTANTES:');
  const importantLogs = logs.filter(l => 
    l.includes('Actualizando markers') || 
    l.includes('Marker agregado') ||
    l.includes('Cars changed') ||
    l.includes('Cars unchanged') ||
    l.includes('Total markers')
  );
  
  if (importantLogs.length > 0) {
    importantLogs.slice(0, 10).forEach(log => console.log(`   ${log}`));
    if (importantLogs.length > 10) {
      console.log(`   ... y ${importantLogs.length - 10} más`);
    }
  } else {
    console.log('   (No se encontraron logs relevantes)');
  }
  
  await browser.close();
  
  console.log('\n' + '='.repeat(60));
  console.log('DIAGNÓSTICO:');
  console.log('='.repeat(60));
  
  if (final === 0) {
    console.log('❌ PROBLEMA: Los markers se eliminan o nunca se crean');
    console.log('   Posibles causas:');
    console.log('   1. updateMarkers() se llama con array vacío');
    console.log('   2. Los markers se crean pero se eliminan después');
    console.log('   3. Error en createPhotoMarker()');
  } else if (changes > 5) {
    console.log('⚠️  PROBLEMA: Markers cambian demasiado (parpadeo)');
    console.log(`   Se detectaron ${changes} cambios en 10 segundos`);
  } else if (final > 0 && changes <= 2) {
    console.log('✅ BIEN: Markers son estables');
    console.log(`   ${final} markers presentes y sin cambios excesivos`);
  }
  
  console.log('='.repeat(60));
})();
