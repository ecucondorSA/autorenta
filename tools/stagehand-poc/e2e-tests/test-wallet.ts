/**
 * Test E2E - Wallet y Retiros
 *
 * Flujo: Perfil → Wallet → Ver saldo → Historial → Retirar
 */

import { chromium } from 'patchright';
import { CONFIG, setupBrowser, createScreenshotter, login, humanClick, humanScroll, humanWait, humanFill, generateOutputs } from './shared/test-utils';

async function main() {
  console.log('═'.repeat(60));
  console.log('💰 TEST E2E - Wallet y Retiros');
  console.log('═'.repeat(60));

  const { browser, page } = await setupBrowser(chromium, 'test-wallet');
  const screenshot = createScreenshotter('wallet');
  const take = (name: string) => screenshot(page, name);

  try {
    // Login
    await login(page, CONFIG.credentials.owner.email, CONFIG.credentials.owner.password, take);

    // Ir a wallet
    console.log('\n🔄 Accediendo a Wallet...');
    await page.goto(`${CONFIG.baseUrl}/wallet`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await take('wallet-main');

    // Capturar saldo
    const balanceElement = page.locator('text=/R\\$|saldo|balance/i').first();
    if (await balanceElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   → Saldo visible');
      await take('balance-visible');
    }

    // Scroll para ver historial
    console.log('\n🔄 Viendo historial de transacciones...');
    await humanScroll(page, 300);
    await take('transactions-history');

    // Buscar transacciones
    const transactions = page.locator('[class*="transaction"], [class*="history"], [class*="item"]');
    const count = await transactions.count();
    console.log(`   → ${count} transacciones encontradas`);

    await humanScroll(page, 300);
    await take('more-transactions');

    // ========== RETIRAR FONDOS ==========
    console.log('\n🔄 Accediendo a retiros...');
    const withdrawBtn = page.locator('button:has-text("Retirar"), button:has-text("Transferir"), a:has-text("Retirar")').first();
    if (await withdrawBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, withdrawBtn);
      await humanWait(2000);
      await take('withdraw-screen');
    }

    // Ir a página de retiros directamente
    await page.goto(`${CONFIG.baseUrl}/wallet/withdraw`, { waitUntil: 'domcontentloaded' });
    await humanWait(2000);
    await take('withdraw-page');

    // Buscar formulario de retiro
    const amountInput = page.locator('input[name="amount"], input[type="number"], input[placeholder*="monto" i]').first();
    if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   → Formulario de retiro encontrado');
      await humanFill(amountInput, '100');
      await take('amount-entered');
    }

    // Buscar cuenta bancaria
    const bankAccount = page.locator('select, [role="listbox"], [class*="bank"], [class*="account"]').first();
    if (await bankAccount.isVisible({ timeout: 2000 }).catch(() => false)) {
      await humanClick(page, bankAccount);
      await humanWait(500);
      await take('bank-account-select');
    }

    // Scroll para ver botón de confirmar
    await humanScroll(page, 200);
    await take('withdraw-form-complete');

    // Capturar botón de retiro
    const confirmWithdrawBtn = page.locator('button:has-text("Confirmar"), button:has-text("Retirar"), button:has-text("Transferir")').first();
    if (await confirmWithdrawBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✅ Formulario de retiro listo');
      await take('ready-to-withdraw');
      console.log('   ⚠️ NO se ejecuta el retiro real (test seguro)');
    }

    await take('final-state');

    // Generar outputs
    console.log('\n🎬 Generando videos...');
    const screenshotDir = '/home/edu/autorenta/tools/stagehand-poc/screenshots/wallet';
    await generateOutputs(screenshotDir, 'test-wallet');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST DE WALLET COMPLETADO');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n💥 Error:', error);
    await take('error-state');
  } finally {
    console.log('\n⏸️ Browser abierto - ciérralo manualmente');
  }
}

main().catch(console.error);
