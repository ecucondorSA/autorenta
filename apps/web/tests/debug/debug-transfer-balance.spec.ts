import { test, expect } from '@playwright/test';

test.describe('Debug Transfer Balance', () => {
  test('should capture balance logs and display', async ({ page }) => {
    // Capturar logs de consola
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
    });

    // Ir directo a /wallet/transfer (asumiendo sesión guardada o público)
    await page.goto('https://autorenta-web.pages.dev/wallet/transfer');
    
    // Esperar que cargue completamente
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Dar tiempo a que ejecute ngOnInit
    
    // Capturar el saldo mostrado en la UI
    try {
      const balanceElement = await page.locator('text=Saldo disponible').locator('..').locator('p.text-3xl').first();
      const balanceText = await balanceElement.textContent({ timeout: 5000 });
      
      console.log('\n📊 INFORMACIÓN CAPTURADA:');
      console.log('='.repeat(60));
      console.log('\n💰 Saldo mostrado en UI:', balanceText);
    } catch (e) {
      console.log('\n⚠️ No se pudo capturar el saldo (probablemente requiere login)');
    }
    
    console.log('\n📝 Logs de consola relevantes:');
    console.log('-'.repeat(60));
    const relevantLogs = consoleLogs.filter(log => 
      log.includes('[TransferFundsComponent]') || 
      log.includes('[WalletService]') ||
      log.includes('[WalletLedgerService]')
    );
    
    if (relevantLogs.length > 0) {
      relevantLogs.forEach(log => console.log(log));
    } else {
      console.log('No se encontraron logs relevantes. Mostrando todos los logs:');
      consoleLogs.forEach(log => console.log(log));
    }
    console.log('='.repeat(60));
    
    // También capturar el localStorage para ver el caché
    const localStorageData = await page.evaluate(() => {
      const data: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key) || '';
        }
      }
      return data;
    });
    
    console.log('\n💾 Datos en localStorage:');
    console.log('-'.repeat(60));
    const walletKeys = Object.entries(localStorageData).filter(([key]) => 
      key.includes('wallet') || key.includes('supabase') || key.includes('auth')
    );
    
    if (walletKeys.length > 0) {
      walletKeys.forEach(([key, value]) => {
        console.log(`\n${key}:`);
        try {
          const parsed = JSON.parse(value);
          console.log(JSON.stringify(parsed, null, 2));
        } catch {
          console.log(value.substring(0, 200) + (value.length > 200 ? '...' : ''));
        }
      });
    } else {
      console.log('No se encontraron datos de wallet en localStorage');
    }
    console.log('='.repeat(60));
    
    // Tomar screenshot para referencia
    await page.screenshot({ path: '/tmp/transfer-balance-debug.png', fullPage: true });
    console.log('\n📸 Screenshot guardado en: /tmp/transfer-balance-debug.png');
    
    // Verificar si está logueado o redirigido a login
    const currentURL = page.url();
    console.log('\n🌐 URL actual:', currentURL);
    
    if (currentURL.includes('/auth/login')) {
      console.log('⚠️ Usuario no autenticado - redirigido a login');
    }
  });
});
