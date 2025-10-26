import { chromium } from '@playwright/test';

async function inspectPricesInPage() {
  console.log('🔍 Inspeccionando precios en la página...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:4200/cars', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Página cargada\n');
    
    // Esperar un poco para asegurar que los precios dinámicos se carguen
    await page.waitForTimeout(3000);
    
    // Inspeccionar el HTML de la página
    const pageInfo = await page.evaluate(() => {
      const body = document.body.innerHTML;
      
      // Buscar todos los elementos que contengan "precio" o números con formato de moneda
      const pricePatterns = [
        /\$[\d,]+/g,
        /COP[\s]*[\d,]+/g,
        /[\d,]+[\s]*COP/g,
        /precio[^<]*\$?[\d,]+/gi
      ];
      
      const foundPrices: string[] = [];
      pricePatterns.forEach(pattern => {
        const matches = body.match(pattern);
        if (matches) {
          foundPrices.push(...matches);
        }
      });
      
      // Buscar elementos específicos de precio
      const priceElements = document.querySelectorAll('[class*="price"], [class*="precio"], .card-price, mat-card-subtitle');
      const extractedPrices = Array.from(priceElements).map(el => ({
        className: el.className,
        text: el.textContent?.trim() || ''
      }));
      
      // Buscar tarjetas de autos
      const carCards = document.querySelectorAll('mat-card, app-car-card, [class*="car-card"]');
      
      return {
        totalCards: carCards.length,
        foundPrices: [...new Set(foundPrices)].slice(0, 20),
        priceElements: extractedPrices.slice(0, 10),
        hasCarCards: carCards.length > 0,
        pageTitle: document.title,
        url: window.location.href
      };
    });
    
    console.log('📊 Información de la página:');
    console.log('━'.repeat(60));
    console.log(`Título: ${pageInfo.pageTitle}`);
    console.log(`URL: ${pageInfo.url}`);
    console.log(`Tarjetas de autos encontradas: ${pageInfo.totalCards}`);
    console.log(`¿Tiene car-cards?: ${pageInfo.hasCarCards}`);
    console.log('━'.repeat(60));
    
    if (pageInfo.foundPrices.length > 0) {
      console.log('\n💰 Precios encontrados en el HTML:');
      pageInfo.foundPrices.forEach((price, i) => {
        console.log(`  ${i + 1}. ${price}`);
      });
    } else {
      console.log('\n⚠️  No se encontraron precios en formato estándar');
    }
    
    if (pageInfo.priceElements.length > 0) {
      console.log('\n🏷️  Elementos de precio encontrados:');
      pageInfo.priceElements.forEach((el, i) => {
        console.log(`  ${i + 1}. [${el.className}] → "${el.text}"`);
      });
    }
    
    // Capturar los logs de consola
    console.log('\n📝 Capturando logs de consola del navegador...');
    const consoleLogs: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('CarCard') || text.includes('price') || text.includes('precio')) {
        consoleLogs.push(`[${msg.type()}] ${text}`);
      }
    });
    
    // Recargar para capturar logs
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    if (consoleLogs.length > 0) {
      console.log('\n🔊 Logs relevantes de la consola:');
      consoleLogs.forEach(log => console.log(`  ${log}`));
    } else {
      console.log('\n⚠️  No se encontraron logs de CarCard en la consola');
    }
    
    // Capturar Network requests relacionadas con precios
    const requests: string[] = [];
    page.on('request', req => {
      const url = req.url();
      if (url.includes('calculate') || url.includes('price') || url.includes('cars')) {
        requests.push(`${req.method()} ${url}`);
      }
    });
    
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    if (requests.length > 0) {
      console.log('\n🌐 Requests de red relevantes:');
      requests.forEach(req => console.log(`  ${req}`));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

inspectPricesInPage().catch(console.error);
