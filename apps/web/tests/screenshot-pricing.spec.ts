import { test, expect } from '@playwright/test';

test('Capturar screenshot de precios - Hyundai Creta 2025', async ({ page }) => {
  console.log('\n🚀 Iniciando captura de screenshot...\n');

  // 1. Navegar a la página HOME que usa app-car-card directamente
  console.log('📍 Navegando a /home...');
  await page.goto('http://localhost:4200/home', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  // 2. Esperar a que se carguen las tarjetas de autos
  console.log('⏳ Esperando que carguen los autos...');
  await page.waitForTimeout(5000);  // Tiempo para dynamic pricing

  // 3. Intentar encontrar el elemento que contenga el precio
  const priceElements = page.locator('text=/\\$\\s*[\\d.,]+/');
  const count = await priceElements.count();
  console.log(`💰 Encontrados ${count} elementos con precios`);

  // 4. Buscar específicamente el Hyundai Creta 2025
  console.log('🔍 Buscando Hyundai Creta 2025...');
  
  // Buscar por diferentes variantes del nombre
  const variants = [
    'Hyundai Creta 2025',
    'Hyundai Creta',
    'HYUNDAI CRETA',
  ];

  let carFound = false;
  let carLocator = null;

  for (const variant of variants) {
    const locator = page.locator(`text=${variant}`).first();
    const isVisible = await locator.isVisible().catch(() => false);
    
    if (isVisible) {
      console.log(`✅ Encontrado: "${variant}"`);
      carLocator = locator;
      carFound = true;
      break;
    } else {
      console.log(`❌ No encontrado: "${variant}"`);
    }
  }

  // 5. Screenshot general de la página
  console.log('\n📸 Tomando screenshot general de la página...');
  await page.screenshot({
    path: '/home/edu/screenshot-cars-list-full.png',
    fullPage: true,
  });
  console.log('✅ Screenshot general guardado: /home/edu/screenshot-cars-list-full.png');

  // 6. Si encontramos el auto, hacer zoom y screenshot específico
  if (carFound && carLocator) {
    console.log('\n🔎 Haciendo screenshot específico del Hyundai Creta...');
    
    // Hacer scroll al elemento
    await carLocator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Buscar el contenedor padre (la tarjeta completa)
    const card = carLocator.locator('xpath=ancestor::article').first();
    const cardExists = await card.isVisible().catch(() => false);

    if (cardExists) {
      // Screenshot de la tarjeta específica
      await card.screenshot({
        path: '/home/edu/screenshot-hyundai-creta-card.png',
      });
      console.log('✅ Screenshot de tarjeta guardado: /home/edu/screenshot-hyundai-creta-card.png');

      // Extraer el precio mostrado
      const priceInCard = card.locator('text=/\\$\\s*[\\d.,]+/').first();
      const priceText = await priceInCard.textContent().catch(() => 'No encontrado');
      console.log(`💵 Precio mostrado en la tarjeta: ${priceText}`);
    } else {
      console.log('⚠️  No se pudo encontrar la tarjeta completa');
    }
  } else {
    console.log('\n⚠️  Hyundai Creta 2025 no encontrado en la lista');
    console.log('📝 Listando todos los autos visibles:');
    
    // Listar todos los títulos de autos
    const titles = page.locator('h3, h2, .card-title, [class*="title"]');
    const titleCount = await titles.count();
    
    for (let i = 0; i < Math.min(titleCount, 10); i++) {
      const text = await titles.nth(i).textContent().catch(() => '');
      if (text.trim()) {
        console.log(`   ${i + 1}. ${text.trim()}`);
      }
    }
  }

  // 7. Screenshot del viewport actual (lo que se ve sin scroll)
  console.log('\n📸 Tomando screenshot del viewport...');
  await page.screenshot({
    path: '/home/edu/screenshot-cars-list-viewport.png',
    fullPage: false,
  });
  console.log('✅ Screenshot viewport guardado: /home/edu/screenshot-cars-list-viewport.png');

  // 8. Capturar información de todos los precios visibles
  console.log('\n💰 Analizando precios visibles:');
  const allPrices = page.locator('text=/\\$\\s*[\\d.,]+/');
  const priceCount = await allPrices.count();
  
  console.log(`Total de elementos con precio: ${priceCount}`);
  for (let i = 0; i < Math.min(priceCount, 15); i++) {
    const price = await allPrices.nth(i).textContent();
    console.log(`   ${i + 1}. ${price}`);
  }

  console.log('\n✨ Capturas completadas!\n');
  console.log('📁 Archivos generados:');
  console.log('   1. /home/edu/screenshot-cars-list-full.png (página completa)');
  console.log('   2. /home/edu/screenshot-cars-list-viewport.png (viewport)');
  console.log('   3. /home/edu/screenshot-hyundai-creta-card.png (si se encontró)');
});
