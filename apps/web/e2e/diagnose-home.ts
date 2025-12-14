import { chromium } from 'patchright';

(async () => {
  console.log('🔍 Iniciando diagnóstico de la página de inicio...');
  
  // Iniciar Patchright (headless true para rapidez en este entorno)
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('🌍 Navegando a http://localhost:4200...');
  
  try {
    await page.goto('http://localhost:4200', { waitUntil: 'domcontentloaded' });
    
    // Esperar un poco para renderizado dinámico
    console.log('⏳ Esperando renderizado (2s)...');
    await page.waitForTimeout(2000);

    // 1. Verificar Hero Section
    const heroTitle = await page.$('h1');
    if (heroTitle) {
      const text = await heroTitle.innerText();
      console.log(`✅ Hero Title encontrado: "${text.replace(/\n/g, ' ')}"`);
    } else {
      console.error('❌ Hero Title (h1) NO encontrado.');
    }

    // 2. Verificar Calculadora
    // Buscamos texto específico o la clase del contenedor
    // En el template restaurado: <h3 class="text-xl font-bold text-text-primary">Calculadora</h3>
    const calculatorHeader = await page.getByText('Calculadora', { exact: false }).first();
    const isCalcVisible = await calculatorHeader.isVisible();
    
    if (isCalcVisible) {
      console.log('✅ Sección "Calculadora" encontrada y visible.');
    } else {
      console.error('❌ Sección "Calculadora" NO encontrada o no visible.');
      
      // Dump del texto de la página para debugging si falla
      const bodyText = await page.innerText('body');
      console.log('--- Texto parcial del body ---');
      console.log(bodyText.substring(0, 500) + '...');
    }

    // 3. Verificar Marketplace (Listado de autos)
    // Selector del template restaurado: article.group
    const carCards = await page.$$('article.group');
    if (carCards.length > 0) {
      console.log(`✅ Marketplace activo: Se encontraron ${carCards.length} tarjetas de autos.`);
    } else {
      console.error('❌ No se encontraron tarjetas de autos (article.group).');
      
      const emptyState = await page.$('.empty-state-card');
      if (emptyState) {
        console.warn('⚠️ Se muestra el estado "No encontramos autos". El componente carga pero no hay datos.');
      }
    }

    // 4. Verificar Footer
    const footer = await page.$('app-footer');
    if (footer) {
      const isVisible = await footer.isVisible();
      console.log(`✅ Footer encontrado (Visible: ${isVisible}).`);
    } else {
      console.error('❌ Footer NO encontrado en el DOM.');
    }

  } catch (error) {
    console.error('🚨 Error durante el diagnóstico:', error);
    // Verificar si es error de conexión
    if (String(error).includes('ERR_CONNECTION_REFUSED')) {
      console.error('🔴 La aplicación no parece estar corriendo en http://localhost:4200. Asegúrate de iniciar "npm start".');
    }
  } finally {
    console.log('🏁 Diagnóstico finalizado.');
    await browser.close();
    process.exit(0);
  }
})();