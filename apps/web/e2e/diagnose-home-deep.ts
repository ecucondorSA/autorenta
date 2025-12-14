import { chromium } from 'patchright';

(async () => {
  console.log('🔍 Verificando Marketplace: Grid y Mapa...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // Dar tiempo a Angular para renderizar

  // Capturar estado del componente desde el navegador
  const componentState = await page.evaluate(() => {
    const appRoot = document.querySelector('app-marketplace-v2-page');
    if (!appRoot) return null;
    // Esto asume que el componente se ha inicializado y es accesible
    // Podría requerir el dev mode o activar un flag de debug en el componente
    // o inyectar una pequeña función de debug en el init script de Patchright
    return {
      viewMode: (window as any).ng.getComponent(appRoot)?.viewMode?.() || 'unknown',
      isDesktop: (window as any).ng.getComponent(appRoot)?.isDesktop?.() || 'unknown',
      visibleCarsLength: (window as any).ng.getComponent(appRoot)?.visibleCars?.().length || 0,
    };
  });

  console.log('📊 Estado del componente (desde el navegador):', componentState);

  // Verificar Hero Section
  const heroSection = await page.$('.hero-minimal');
  console.log(`✅ Hero Section: ${!!heroSection && await heroSection.isVisible() ? 'Visible' : 'No Visible'}`);

  // Verificar Marketplace Section (Grid de autos)
  const carCards = await page.$$('section:has-text("Autos cerca de ti") article');
  console.log(`🚗 Tarjetas de autos (Marketplace Grid) encontradas: ${carCards.length}`);

  // Verificar Static Map Preview
  const staticMapPreview = await page.$('div.static-map-container img');
  console.log(`🗺️ Mapa estático (Right Panel): ${!!staticMapPreview && await staticMapPreview.isVisible() ? 'Visible' : 'No Visible'}`);

  // Verificar Owner CTA + Calculadora
  const calculatorSection = await page.$('section:has-text("Calculadora")');
  console.log(`🧮 Calculadora: ${!!calculatorSection && await calculatorSection.isVisible() ? 'Visible' : 'No Visible'}`);

  // Verificar Partners Section
  const partnersSection = await page.$('section:has-text("MercadoPago")');
  console.log(`🤝 Partners Section: ${!!partnersSection && await partnersSection.isVisible() ? 'Visible' : 'No Visible'}`);


  await browser.close();
})();