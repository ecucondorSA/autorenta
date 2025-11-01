// Pegar esto en la consola del navegador (F12)

console.log('🔍 DIAGNÓSTICO COMPLETO DEL MAPA\n');

// 1. Verificar componente
const mapComponent = document.querySelector('app-cars-map');
console.log('1️⃣ Componente:', mapComponent ? '✅ Encontrado' : '❌ No encontrado');

// 2. Verificar canvas
const canvas = document.querySelector('.mapboxgl-canvas');
console.log('2️⃣ Canvas Mapbox:', canvas ? '✅ Visible' : '❌ No visible');
if (canvas) {
  console.log('   Tamaño:', canvas.width, 'x', canvas.height);
}

// 3. Contar markers
const photoMarkers = document.querySelectorAll('.car-marker-photo');
const mapboxMarkers = document.querySelectorAll('.mapboxgl-marker');
console.log('3️⃣ Markers:');
console.log('   .car-marker-photo:', photoMarkers.length);
console.log('   .mapboxgl-marker:', mapboxMarkers.length);

// 4. Verificar si están ocultos
if (photoMarkers.length > 0) {
  const firstMarker = photoMarkers[0];
  const styles = window.getComputedStyle(firstMarker);
  console.log('4️⃣ Primer marker:');
  console.log('   Display:', styles.display);
  console.log('   Visibility:', styles.visibility);
  console.log('   Opacity:', styles.opacity);
  console.log('   Z-index:', styles.zIndex);
  console.log('   Position:', styles.position);
  console.log('   Transform:', styles.transform);
  
  const rect = firstMarker.getBoundingClientRect();
  console.log('   Posición en pantalla:', {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height
  });
  console.log('   ¿Visible en viewport?', rect.top >= 0 && rect.left >= 0);
}

// 5. Verificar Mapbox
console.log('5️⃣ Mapbox:', typeof mapboxgl !== 'undefined' ? '✅ Cargado' : '❌ No cargado');

console.log('\n✅ Diagnóstico completo');
