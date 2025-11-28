import { test, expect } from '@playwright/test';
import { WalletPage } from '../pages/wallet/WalletPage';

test.use({ storageState: 'tests/.auth/renter.json' });

test.describe('P0 - Wallet depósito', () => {
  test('debería abrir el modal de depósito y preparar una transferencia bancaria', async ({ page }) => {
    const walletPage = new WalletPage(page);
    await walletPage.goto();
    expect(await walletPage.isDepositButtonVisible()).toBeTruthy();

    await walletPage.clickDeposit();

    const modal = page.getByTestId('deposit-modal');
    await expect(modal).toBeVisible();

    // Seleccionar monto y proveedor transferencia bancaria
    const amountInput = modal.getByTestId('deposit-amount-input');
    await amountInput.fill('2000');

    const providerSelect = modal.locator('select');
    await providerSelect.selectOption({ value: 'bank_transfer' });

    // Verificar que se muestran datos de cuenta para transferencia
    await expect(modal.getByText(/Transferencia Bancaria/i)).toBeVisible();
    await expect(modal.getByText(/Alias:/i)).toBeVisible();
    await expect(modal.getByText(/CBU:/i)).toBeVisible();

    // CTA habilitado
    const submit = modal.getByRole('button', { name: /confirmar transferencia/i });
    await expect(submit).toBeEnabled();
  });
});

