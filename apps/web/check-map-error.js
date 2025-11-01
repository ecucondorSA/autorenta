// Script para debuggear el error del mapa en el navegador
// Pegar esto en la consola del navegador

console.log('🔍 Verificando estado del mapa...');

const mapComponent = document.querySelector('app-cars-map');
if (mapComponent) {
  console.log('✅ Componente encontrado');
  
  const errorOverlay = document.querySelector('.error-overlay');
  if (errorOverlay) {
    const errorMessage = errorOverlay.querySelector('.error-message');
    console.error('❌ ERROR EN MAPA:', errorMessage ? errorMessage.textContent : 'Sin mensaje');
  } else {
    console.log('✅ No hay error overlay visible');
  }
  
  const loadingOverlay = document.querySelector('.loading-overlay');
  if (loadingOverlay) {
    console.log('⏳ Mapa cargando...');
  }
  
  const mapCanvas = document.querySelector('.map-canvas');
  if (mapCanvas) {
    console.log('✅ Canvas encontrado:', mapCanvas);
    console.log('   Width:', mapCanvas.offsetWidth, 'Height:', mapCanvas.offsetHeight);
  }
} else {
  console.error('❌ Componente app-cars-map no encontrado');
}

// Verificar si Mapbox está cargado
if (typeof mapboxgl !== 'undefined') {
  console.log('✅ Mapbox GL cargado, versión:', mapboxgl.version);
  console.log('   Access Token:', mapboxgl.accessToken ? 'CONFIGURADO' : '❌ NO CONFIGURADO');
} else {
  console.error('❌ Mapbox GL no está cargado');
}
