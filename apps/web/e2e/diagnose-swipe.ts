import { chromium, devices } from 'patchright';

(async () => {
  console.log('📱 Diagnóstico de Swipe Horizontal (Tinder-style)...');
  
  const iPhone12 = devices['iPhone 12'];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...iPhone12 });
  const page = await context.newPage();

  // Escuchar logs de consola del navegador
  page.on('console', msg => console.log(`🌍 BRW: ${msg.text()}`));
  page.on('pageerror', err => console.log(`🌍 ERR: ${err.message}`));

  try {
    await page.goto('http://localhost:4200/cars', { waitUntil: 'networkidle' });
    
    // Esperar carga (más tiempo por si recompila)
    console.log('⏳ Esperando 5s...');
    await page.waitForTimeout(5000);

    // Verificar modo de vista (boton activo)
    // En mobile el toggle es un floating pill.
    const mapButton = await page.$('button:has-text("Mapa")');
    const listButton = await page.$('button:has-text("Lista")');
    console.log(`🔘 Botones toggle visibles: Mapa=${!!mapButton}, Lista=${!!listButton}`);

    // Buscar el contenedor móvil
    // Buscamos el div que tiene 'overflow-x-auto' y 'snap-x'
    // Como es difícil seleccionar por clases exactas si hay muchas, buscaremos por estructura o clases clave
    const mobileContainer = await page.$('.snap-x.snap-mandatory');
    
    if (mobileContainer) {
      console.log('✅ Contenedor Swipe encontrado.');
      
      // Verificar propiedades CSS computadas
      const overflow = await mobileContainer.evaluate((el) => window.getComputedStyle(el).overflowX);
      const display = await mobileContainer.evaluate((el) => window.getComputedStyle(el).display);
      const flexWrap = await mobileContainer.evaluate((el) => window.getComputedStyle(el).flexWrap);
      
      console.log(`📊 Propiedades del contenedor: Display=${display}, OverflowX=${overflow}, FlexWrap=${flexWrap}`);

      // Verificar hijos (tarjetas)
      const cards = await mobileContainer.$$(':scope > a'); // Links directos
      console.log(`🃏 Número de tarjetas en el carrusel: ${cards.length}`);
      
      if (cards.length > 0) {
        const firstCardWidth = await cards[0].evaluate((el) => el.getBoundingClientRect().width);
        const containerWidth = await mobileContainer.evaluate((el) => el.getBoundingClientRect().width);
        
        console.log(`📏 Ancho del contenedor: ${containerWidth}px`);
        console.log(`📏 Ancho de la primera tarjeta: ${firstCardWidth}px`);
        
        if (firstCardWidth < containerWidth * 0.5) {
             console.warn('⚠️ ALERTA: La tarjeta parece muy estrecha. Debería ser ~85% del ancho.');
        }
      }

    } else {
      console.error('❌ Contenedor Swipe (.snap-x.snap-mandatory) NO encontrado. ¿Está visible?');
      // Verificar si el grid desktop está visible por error
      const desktopGrid = await page.$('.sm\\:grid'); // Escapar dos puntos
      const isDesktopVisible = await desktopGrid?.isVisible();
      if (isDesktopVisible) {
          console.error('⚠️ El grid de escritorio parece estar visible en móvil.');
      }
    }

    // Captura para inspección visual
    await page.screenshot({ path: 'swipe-debug.png' });
    console.log('📸 Captura guardada en swipe-debug.png');

  } catch (error) {
    console.error('🚨 Error:', error);
  } finally {
    await browser.close();
  }
})();
