import { test, expect } from '@playwright/test';
import type { ConsoleMessage, Request, Response } from '@playwright/test';

/**
 * Script de diagnóstico con Playwright para problemas de pricing
 * Captura logs de Console y Network para identificar por qué el precio no se actualiza
 */

interface PricingLog {
  type: 'console' | 'network';
  timestamp: string;
  level?: string;
  message?: string;
  url?: string;
  status?: number;
  response?: any;
}

const logs: PricingLog[] = [];
let networkRequests: Request[] = [];
let networkResponses: Map<string, Response> = new Map();

test.describe('Diagnóstico de Pricing - Hyundai Creta 2025', () => {
  test.beforeEach(async ({ page }) => {
    // Limpiar logs
    logs.length = 0;
    networkRequests = [];
    networkResponses.clear();

    // 🎧 Capturar mensajes de Console
    page.on('console', (msg: ConsoleMessage) => {
      const timestamp = new Date().toISOString();
      const text = msg.text();
      
      // Solo capturar logs relacionados con pricing
      if (
        text.includes('[CarCard]') ||
        text.includes('[DynamicPricing]') ||
        text.includes('price') ||
        text.includes('Price')
      ) {
        logs.push({
          type: 'console',
          timestamp,
          level: msg.type(),
          message: text,
        });

        console.log(`[${msg.type().toUpperCase()}] ${text}`);
      }
    });

    // 🎧 Capturar errores de página
    page.on('pageerror', (error) => {
      logs.push({
        type: 'console',
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `PAGE ERROR: ${error.message}`,
      });
      console.error('❌ Page Error:', error.message);
    });

    // 🎧 Capturar requests de Network
    page.on('request', (request: Request) => {
      if (
        request.url().includes('calculate_dynamic_price') ||
        request.url().includes('cars') ||
        request.url().includes('pricing')
      ) {
        networkRequests.push(request);
        console.log(`📤 Request: ${request.method()} ${request.url()}`);
      }
    });

    // 🎧 Capturar responses de Network
    page.on('response', async (response: Response) => {
      const url = response.url();
      
      if (
        url.includes('calculate_dynamic_price') ||
        url.includes('pricing_regions') ||
        (url.includes('cars') && url.includes('rest/v1'))
      ) {
        networkResponses.set(url, response);
        
        const timestamp = new Date().toISOString();
        const status = response.status();
        
        console.log(`📥 Response: ${status} ${url}`);

        try {
          const responseBody = await response.json();
          
          logs.push({
            type: 'network',
            timestamp,
            url,
            status,
            response: responseBody,
          });

          if (url.includes('calculate_dynamic_price')) {
            console.log('💰 RPC Response:', JSON.stringify(responseBody, null, 2));
          }
        } catch (e) {
          // Response no es JSON
          console.log(`⚠️  Response is not JSON: ${url}`);
        }
      }
    });
  });

  test('Diagnosticar precio del Hyundai Creta 2025', async ({ page }) => {
    console.log('\n🚀 Iniciando diagnóstico de pricing...\n');

    // 1. Navegar a la lista de autos
    console.log('📍 Step 1: Navegando a /cars...');
    await page.goto('http://localhost:4200/cars', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Esperar que cargue la lista
    await page.waitForSelector('app-car-card', { timeout: 30000 });
    console.log('✅ Lista de autos cargada\n');

    // Esperar un poco para que se ejecuten las llamadas de pricing
    await page.waitForTimeout(3000);

    // 2. Buscar el auto específico
    console.log('📍 Step 2: Buscando Hyundai Creta 2025...');
    
    const carCard = page.locator('app-car-card').filter({
      hasText: /Hyundai.*Creta.*2025/i,
    }).first();

    const isVisible = await carCard.isVisible();
    console.log(`Auto visible: ${isVisible ? '✅ Sí' : '❌ No'}\n`);

    if (isVisible) {
      // 3. Extraer el precio mostrado en la tarjeta
      console.log('📍 Step 3: Extrayendo precio de la tarjeta...');
      
      const priceElement = carCard.locator('text=/\$\s*[\d,]+/').first();
      const priceText = await priceElement.textContent();
      
      console.log(`💵 Precio mostrado: ${priceText}`);

      // Limpiar y parsear el precio
      const priceMatch = priceText?.match(/[\d,]+/);
      const displayedPrice = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;
      
      console.log(`💰 Precio numérico: ${displayedPrice}`);

      // 4. Verificar si es el precio correcto
      const expectedPrice = 80640; // Precio calculado por el backend
      const staticPrice = 75000; // Precio estático en BD

      if (displayedPrice === staticPrice) {
        console.log('\n⚠️  WARNING: Mostrando precio ESTÁTICO ($75,000)');
        console.log('   El precio dinámico NO se aplicó');
      } else if (displayedPrice === expectedPrice) {
        console.log('\n✅ SUCCESS: Mostrando precio DINÁMICO correcto ($80,640)');
      } else {
        console.log(`\n🤔 UNKNOWN: Mostrando precio inesperado: $${displayedPrice}`);
      }

      // 5. Clickear para abrir el detalle
      console.log('\n📍 Step 4: Abriendo detalle del auto...');
      await carCard.click();
      
      // Esperar que cargue el detalle
      await page.waitForURL(/\/cars\/[a-f0-9-]+/, { timeout: 10000 });
      await page.waitForSelector('app-dynamic-price-display, .text-3xl', { timeout: 10000 });
      console.log('✅ Página de detalle cargada\n');

      // Esperar que se ejecute el cálculo de precio
      await page.waitForTimeout(3000);

      // 6. Verificar precio en el detalle
      console.log('📍 Step 5: Verificando precio en detalle...');
      
      // Buscar el componente de dynamic price display
      const dynamicPriceDisplay = page.locator('app-dynamic-price-display');
      const hasDynamicPrice = await dynamicPriceDisplay.isVisible().catch(() => false);

      if (hasDynamicPrice) {
        const detailPrice = await dynamicPriceDisplay.locator('text=/\$\s*[\d,]+/').first().textContent();
        console.log(`💵 Precio en detalle (dynamic): ${detailPrice}`);
      } else {
        const staticPriceElement = page.locator('.text-3xl').filter({ hasText: /\$/ }).first();
        const detailPrice = await staticPriceElement.textContent().catch(() => 'No encontrado');
        console.log(`💵 Precio en detalle (static): ${detailPrice}`);
      }

      // Buscar mensaje de error
      const errorMessage = await page.locator('text=/No se pudo calcular el precio/i').isVisible().catch(() => false);
      if (errorMessage) {
        console.log('❌ ERROR: Aparece mensaje "No se pudo calcular el precio"');
      }
    }

    // 7. Análisis de logs
    console.log('\n' + '='.repeat(80));
    console.log('📊 ANÁLISIS DE LOGS');
    console.log('='.repeat(80) + '\n');

    const consoleLogs = logs.filter((l) => l.type === 'console');
    const networkLogs = logs.filter((l) => l.type === 'network');

    console.log(`📝 Console logs capturados: ${consoleLogs.length}`);
    console.log(`🌐 Network requests capturados: ${networkLogs.length}\n`);

    // Verificar si se llamó a loadDynamicPrice
    const carCardLogs = consoleLogs.filter((l) => l.message?.includes('[CarCard]'));
    console.log(`🔍 Logs de CarCard: ${carCardLogs.length}`);
    
    if (carCardLogs.length === 0) {
      console.log('❌ PROBLEMA: No se ejecutó loadDynamicPrice()');
      console.log('   → El componente no está cargando precios dinámicos');
    } else {
      console.log('✅ CarCard ejecutó loadDynamicPrice()');
      carCardLogs.forEach((log) => {
        console.log(`   - ${log.message}`);
      });
    }

    // Verificar llamadas al servicio
    const pricingServiceLogs = consoleLogs.filter((l) => l.message?.includes('[DynamicPricing]'));
    console.log(`\n📊 Logs de DynamicPricing Service: ${pricingServiceLogs.length}`);
    
    if (pricingServiceLogs.length === 0) {
      console.log('❌ PROBLEMA: No se llamó al servicio de pricing');
    } else {
      console.log('✅ Servicio de pricing ejecutado');
      pricingServiceLogs.forEach((log) => {
        console.log(`   - ${log.message}`);
      });
    }

    // Verificar llamadas RPC
    const rpcRequests = networkLogs.filter((l) => l.url?.includes('calculate_dynamic_price'));
    console.log(`\n🔧 Llamadas RPC a calculate_dynamic_price: ${rpcRequests.length}`);

    if (rpcRequests.length === 0) {
      console.log('❌ PROBLEMA: No se hizo ninguna llamada RPC');
      console.log('   → El servicio no está ejecutando calculatePriceRPC()');
    } else {
      rpcRequests.forEach((log, idx) => {
        console.log(`\n   RPC Call ${idx + 1}:`);
        console.log(`   Status: ${log.status}`);
        console.log(`   Response:`, JSON.stringify(log.response, null, 2));
      });
    }

    // Verificar errores
    const errorLogs = consoleLogs.filter((l) => l.level === 'error');
    if (errorLogs.length > 0) {
      console.log(`\n❌ ERRORES ENCONTRADOS: ${errorLogs.length}`);
      errorLogs.forEach((log) => {
        console.log(`   - ${log.message}`);
      });
    }

    // 8. Diagnóstico final
    console.log('\n' + '='.repeat(80));
    console.log('🎯 DIAGNÓSTICO FINAL');
    console.log('='.repeat(80) + '\n');

    if (rpcRequests.length > 0 && rpcRequests[0].status === 200) {
      const rpcResponse = rpcRequests[0].response;
      const calculatedPrice = rpcResponse.total_price;
      
      console.log(`✅ Backend funciona: Precio calculado = $${calculatedPrice}`);
      
      if (displayedPrice === calculatedPrice) {
        console.log('✅ Frontend funciona: Precio se aplica correctamente');
        console.log('\n🎉 NO HAY PROBLEMA - Sistema funcionando correctamente');
      } else {
        console.log(`❌ Frontend NO aplica el precio: Muestra $${displayedPrice} en lugar de $${calculatedPrice}`);
        console.log('\n🔴 PROBLEMA CONFIRMADO:');
        console.log('   1. Backend calcula correctamente');
        console.log('   2. RPC retorna el precio correcto');
        console.log('   3. Frontend NO actualiza el precio en el DOM');
        console.log('\n💡 POSIBLES CAUSAS:');
        console.log('   - Signal no se actualiza correctamente');
        console.log('   - Change Detection no se dispara');
        console.log('   - Cache del navegador');
        console.log('   - Timing issue (componente ya renderizó antes de recibir precio)');
      }
    } else if (rpcRequests.length === 0) {
      console.log('❌ No se hizo llamada RPC');
      console.log('\n🔴 PROBLEMA: Frontend no está ejecutando el flujo de pricing');
      console.log('\n💡 POSIBLES CAUSAS:');
      console.log('   - Auto no tiene region_id');
      console.log('   - loadDynamicPrice() no se ejecuta');
      console.log('   - Condición de guardia detiene el flujo');
    } else {
      console.log(`❌ RPC falló con status ${rpcRequests[0].status}`);
      console.log('\n🔴 PROBLEMA: Backend no puede calcular el precio');
      console.log('\n💡 POSIBLES CAUSAS:');
      console.log('   - Función RPC no existe');
      console.log('   - Permisos incorrectos');
      console.log('   - Error en los datos (región, exchange rate, etc.)');
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Guardar logs en archivo
    const fs = require('fs');
    const logsJson = JSON.stringify(logs, null, 2);
    fs.writeFileSync('/home/edu/playwright-pricing-logs.json', logsJson);
    console.log('📁 Logs guardados en: /home/edu/playwright-pricing-logs.json\n');

    // Screenshot del estado actual
    await page.screenshot({
      path: '/home/edu/playwright-pricing-screenshot.png',
      fullPage: true
    });
    console.log('📸 Screenshot guardado en: /home/edu/playwright-pricing-screenshot.png\n');
  });
});
