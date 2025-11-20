const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    storageState: 'tests/.auth/renter.json' // Usar el estado de auth guardado
  });
  
  const page = await context.newPage();

  try {
    console.log('🔄 Navegando a booking-detail-payment (autenticado como renter)...');
    
    const url = 'http://localhost:4200/bookings/detail-payment?carId=b288ed1c-9544-44e1-b159-8e3354250518&startDate=2025-11-19T00:00:00.000Z&endDate=2025-11-21T00:00:00.000Z';
    
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Esperar a que cargue
    await page.waitForTimeout(8000);
    
    // Tomar screenshot
    await page.screenshot({ 
      path: '/tmp/booking-payment-authenticated.png',
      fullPage: true 
    });
    
    console.log('✅ Screenshot guardado: /tmp/booking-payment-authenticated.png');
    
    // Extraer texto de la página
    const pageText = await page.evaluate(() => document.body.innerText);
    
    console.log('\n📄 Texto de la página:');
    console.log(pageText.substring(0, 500));
    
    // Buscar la tasa de conversión
    const rateMatch = pageText.match(/1\s*USD\s*=\s*\$?\s*([\d,\.]+)\s*ARS/i);
    const totalMatch = pageText.match(/Total.*?\$\s*([\d,\.]+)\s*ARS/i);
    const guaranteeMatch = pageText.match(/En pesos argentinos.*?\$\s*([\d,\.]+)\s*ARS/i);
    
    console.log('\n📊 Información detectada:');
    console.log('Tasa de conversión:', rateMatch ? rateMatch[1] : 'NO ENCONTRADA');
    console.log('Garantía en ARS:', guaranteeMatch ? guaranteeMatch[1] : 'NO ENCONTRADA');
    console.log('Total en ARS:', totalMatch ? totalMatch[1] : 'NO ENCONTRADO');
    
    if (!rateMatch || rateMatch[1] === '' || rateMatch[1] === 'ARS') {
      console.log('\n❌ ERROR: La tasa de conversión NO se está mostrando correctamente');
      process.exit(1);
    } else {
      console.log('\n✅ SUCCESS: La tasa de conversión se está mostrando correctamente');
      console.log(`   Valor detectado: ${rateMatch[1]} ARS por USD`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/tmp/error-screenshot-auth.png' });
    throw error;
  } finally {
    await browser.close();
  }
})();
