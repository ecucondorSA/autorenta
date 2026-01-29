import { chromium, devices } from 'patchright';

(async () => {
  console.log('📱 Iniciando diagnóstico de Grid Móvil...');
  
  // Usar configuración de dispositivo móvil (iPhone 12)
  const iPhone12 = devices['iPhone 12'];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...iPhone12,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('🌍 Navegando a http://localhost:4200/cars...');
  
  try {
    // Ir directamente a la ruta de autos si existe, si no, ir a home y buscar
    await page.goto('http://localhost:4200/cars', { waitUntil: 'networkidle' });
    
    // Esperar a que aparezcan las tarjetas
    console.log('⏳ Esperando carga de tarjetas...');
    
    // Esperar un poco más para asegurar que loading() cambie
    await page.waitForTimeout(3000);

    // Intentar detectar si estamos viendo skeletons o autos reales
    // Los skeletons están dentro de un div con animate-pulse
    const skeletons = await page.$$('.animate-pulse');
    if (skeletons.length > 0) {
        console.log(`⚠️ Detectados ${skeletons.length} esqueletos de carga. Aún cargando.`);
        // Verificar clases del contenedor de skeletons
        const skeletonContainer = await page.$('.animate-pulse').then(el => el?.evaluate(e => e.parentElement?.className));
        console.log(`💀 Clases del contenedor Skeleton: "${skeletonContainer}"`);
        if (skeletonContainer && skeletonContainer.includes('grid-cols-2')) {
            console.log('✅ Skeleton usa 2 columnas.');
        }
    } else {
        console.log('✅ No hay esqueletos visibles, carga finalizada.');
    }

    // Contar tarjetas reales (data-testid="car-card")
    const cards = await page.$$('[data-testid="car-card"]');
    console.log(`📊 Total de tarjetas reales renderizadas: ${cards.length}`);

    // Verificar layout CSS de la grilla REAL
    const gridContainer = await page.$('.grid-view');
    if (gridContainer) {
      const className = await gridContainer.getAttribute('class');
      console.log(`🎨 Clases del contenedor Grid Real: "${className}"`);
      if (className && className.includes('grid-cols-2')) {
        console.log('✅ ÉXITO: La clase "grid-cols-2" está presente en el grid real.');
      } else {
        console.error('❌ ERROR: No se detectó "grid-cols-2" en el contenedor real.');
      }
    } else if (cards.length === 0 && skeletons.length === 0) {
        console.log('ℹ️ Parece que no hay autos (Empty State).');
    }

    // Medir altura total
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(`📏 Altura total de la página: ${bodyHeight}px`);

    // Captura de pantalla completa
    console.log('📸 Tomando captura de pantalla completa...');
    await page.screenshot({ path: 'mobile-grid-check.png', fullPage: true });
    
    // Captura del primer viewport (lo que ve el usuario al entrar)
    console.log('📸 Tomando captura del viewport inicial...');
    await page.screenshot({ path: 'mobile-viewport-check.png' });

  } catch (error) {
    console.error('🚨 Error durante el diagnóstico:', error);
  } finally {
    await browser.close();
    console.log('🏁 Diagnóstico finalizado. Revisa "mobile-grid-check.png".');
  }
})();
