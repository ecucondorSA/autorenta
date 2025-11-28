import { test, expect } from '@playwright/test';
import { WalletPage } from '../pages/wallet/WalletPage';

test.use({ storageState: 'tests/.auth/renter.json' });

test.describe('P0 - Wallet retiro', () => {
  test('debería mostrar el flujo de retiros y validar cuentas bancarias', async ({ page }) => {
    const walletPage = new WalletPage(page);
    await walletPage.goto();

    await walletPage.clickWithdraw();

    // Si no hay cuentas bancarias configuradas, se muestra aviso y el test pasa
    const noAccountsAlert = page.getByText(/no tienes cuentas bancarias agregadas/i);
    if (await noAccountsAlert.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(noAccountsAlert).toBeVisible();
      return;
    }

    // Si existen cuentas, completar formulario mínimo y verificar que el botón está habilitado
    const amountInput = page.locator('input#amount');
    await amountInput.fill('500');

    const selectAccount = page.locator('select#bank_account_id');
    const optionsCount = await selectAccount.locator('option').count();
    expect(optionsCount).toBeGreaterThan(1); // incluye placeholder
    await selectAccount.selectOption({ index: 1 });

    const submitButton = page.getByRole('button', { name: /solicitar retiro|enviar solicitud/i });
    await expect(submitButton).toBeEnabled();
  });
});

