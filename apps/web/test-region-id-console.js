// ================================================================
// SCRIPT DE PRUEBA: Verificar region_id en autos del frontend
// ================================================================
// 
// INSTRUCCIONES:
// 1. Abre la consola del navegador (F12 o Cmd+Option+I)
// 2. Copia y pega este código completo
// 3. Presiona Enter
// 4. Copia el resultado y compártelo
// ================================================================

(function testRegionId() {
  console.log('🔍 === VERIFICACIÓN DE region_id EN AUTOS ===\n');
  
  // Método 1: Buscar el primer CarCard en el DOM
  const firstCard = document.querySelector('app-car-card');
  
  if (!firstCard) {
    console.error('❌ No se encontró ningún app-car-card en el DOM');
    console.log('💡 Asegúrate de estar en la página de listado de autos (/cars)');
    return;
  }
  
  console.log('✅ Encontrado app-car-card');
  
  // Intentar extraer el objeto Car del contexto de Angular
  const ngContext = firstCard.__ngContext__;
  
  if (!ngContext) {
    console.error('❌ No se pudo acceder al __ngContext__ de Angular');
    return;
  }
  
  console.log('✅ Contexto de Angular encontrado');
  console.log('📊 Número de elementos en contexto:', ngContext.length);
  
  // Buscar el objeto Car en diferentes posiciones del contexto
  let car = null;
  let foundAt = -1;
  
  for (let i = 0; i < ngContext.length; i++) {
    const item = ngContext[i];
    if (item && typeof item === 'object') {
      // Verificar si es un objeto Car (tiene id, title, price_per_day)
      if ('id' in item && 'title' in item && 'price_per_day' in item) {
        car = item;
        foundAt = i;
        break;
      }
      // También verificar si está dentro de un objeto context
      if (item.context && item.context.$implicit) {
        const implicit = item.context.$implicit;
        if ('id' in implicit && 'title' in implicit && 'price_per_day' in implicit) {
          car = implicit;
          foundAt = i;
          break;
        }
      }
    }
  }
  
  if (!car) {
    console.error('❌ No se pudo encontrar el objeto Car en el contexto');
    console.log('💡 Intentando método alternativo...');
    
    // Método alternativo: buscar en todos los elementos del contexto
    console.log('📋 Primeros 20 elementos del contexto:');
    for (let i = 0; i < Math.min(20, ngContext.length); i++) {
      console.log(`  [${i}]:`, typeof ngContext[i], ngContext[i]);
    }
    return;
  }
  
  console.log(`✅ Objeto Car encontrado en posición ${foundAt} del contexto\n`);
  
  // Analizar el objeto Car
  console.log('📦 === OBJETO CAR COMPLETO ===');
  console.log('Car object:', car);
  console.log('\n🔑 === PROPIEDADES CLAVE ===');
  console.log('ID:', car.id);
  console.log('Title:', car.title);
  console.log('Price per day:', car.price_per_day);
  console.log('\n🎯 === VERIFICACIÓN region_id ===');
  console.log('Has region_id property?', 'region_id' in car);
  console.log('region_id value:', car.region_id);
  console.log('region_id type:', typeof car.region_id);
  console.log('region_id is null?', car.region_id === null);
  console.log('region_id is undefined?', car.region_id === undefined);
  
  console.log('\n📋 === TODAS LAS PROPIEDADES ===');
  const allKeys = Object.keys(car);
  console.log('Total keys:', allKeys.length);
  console.log('Keys:', allKeys);
  
  // Verificar si region_id está en las keys pero es undefined
  if (allKeys.includes('region_id')) {
    console.log('✅ region_id está en las keys pero su valor es:', car.region_id);
  } else {
    console.log('❌ region_id NO está en las keys del objeto');
  }
  
  // Verificar otros campos relacionados con región
  console.log('\n🌍 === CAMPOS DE UBICACIÓN ===');
  console.log('location_city:', car.location_city);
  console.log('location_state:', car.location_state);
  console.log('location_country:', car.location_country);
  console.log('location_lat:', car.location_lat);
  console.log('location_lng:', car.location_lng);
  
  // Verificar si viene de getAvailableCars o listActiveCars
  console.log('\n📊 === METADATOS DEL AUTO ===');
  console.log('Has photos?', 'photos' in car || 'car_photos' in car);
  console.log('Photos count:', car.photos?.length || car.car_photos?.length || 0);
  console.log('Has owner?', 'owner' in car);
  console.log('Status:', car.status);
  
  console.log('\n✅ === VERIFICACIÓN COMPLETA ===');
  if (car.region_id) {
    console.log('✅ region_id está presente:', car.region_id);
  } else {
    console.log('❌ region_id NO está presente o es null/undefined');
    console.log('💡 Esto explica por qué no se cargan los precios dinámicos');
  }
  
  // Verificar todos los app-car-card en la página
  console.log('\n📋 === TODOS LOS AUTOS EN LA PÁGINA ===');
  const allCards = document.querySelectorAll('app-car-card');
  console.log(`Total de CarCards: ${allCards.length}`);
  
  if (allCards.length > 1) {
    console.log('\nVerificando primeros 3 autos:');
    for (let i = 0; i < Math.min(3, allCards.length); i++) {
      const card = allCards[i];
      const ctx = card.__ngContext__;
      let carObj = null;
      
      for (let j = 0; j < ctx.length; j++) {
        const item = ctx[j];
        if (item && typeof item === 'object' && 'id' in item && 'title' in item) {
          carObj = item;
          break;
        }
      }
      
      if (carObj) {
        console.log(`\n  Auto ${i + 1}:`);
        console.log(`    ID: ${carObj.id}`);
        console.log(`    Title: ${carObj.title}`);
        console.log(`    region_id: ${carObj.region_id || '❌ NO TIENE'}`);
      }
    }
  }
  
  console.log('\n✅ === FIN DE LA VERIFICACIÓN ===');
})();





