// Script corregido para verificar region_id
const firstCard = document.querySelector('app-car-card');

if (!firstCard) {
  console.error('❌ No se encontró app-car-card');
} else {
  const ngContext = firstCard.__ngContext__;
  
  if (!ngContext) {
    console.error('❌ No se pudo acceder al __ngContext__');
  } else {
    // __ngContext__ es array-like, necesitamos convertirlo o iterar
    let car = null;
    
    // Método 1: Buscar en el contexto directamente
    for (let i = 0; i < ngContext.length; i++) {
      const item = ngContext[i];
      if (item && typeof item === 'object' && item.id && item.title) {
        car = item;
        break;
      }
    }
    
    // Método 2: Si no encontramos, buscar en context.$implicit
    if (!car) {
      for (let i = 0; i < ngContext.length; i++) {
        const item = ngContext[i];
        if (item && item.context && item.context.$implicit) {
          const implicit = item.context.$implicit;
          if (implicit.id && implicit.title) {
            car = implicit;
            break;
          }
        }
      }
    }
    
    if (car) {
      console.log('=== RESULTADO ===');
      console.log('Car ID:', car.id);
      console.log('Car Title:', car.title);
      console.log('Has region_id property?', 'region_id' in car);
      console.log('region_id value:', car.region_id);
      console.log('region_id type:', typeof car.region_id);
      console.log('\n📋 Todas las keys:', Object.keys(car));
      console.log('\n🌍 Ubicación:', {
        city: car.location_city,
        state: car.location_state,
        country: car.location_country
      });
    } else {
      console.error('❌ No se encontró el objeto Car en el contexto');
      console.log('📊 Primeros 10 elementos del contexto:');
      for (let i = 0; i < Math.min(10, ngContext.length); i++) {
        console.log(`  [${i}]:`, typeof ngContext[i], ngContext[i]);
      }
    }
  }
}

