import { test, expect, Page } from '@playwright/test';
import { SEED_USERS } from '../helpers/test-data';

const FALLBACK_RENTER = {
  email: 'test-renter@autorenta.com',
  password: 'TestPassword123!',
};

async function ensureRenterAuth(page: Page): Promise<void> {
  const profileLink = page.locator('a[href="/profile"], [data-testid="user-menu"]');
  if (await profileLink.first().isVisible({ timeout: 2000 }).catch(() => false)) return;

  await page.goto('/auth/login');
  await page.getByRole('textbox', { name: /email|correo/i }).fill(SEED_USERS?.renter?.email ?? FALLBACK_RENTER.email);
  await page.getByRole('textbox', { name: /contraseña|password/i }).fill(SEED_USERS?.renter?.password ?? FALLBACK_RENTER.password);
  await page.getByRole('button', { name: /iniciar sesión|entrar|login/i }).click();
  await page.waitForURL(/(cars|wallet|profile)/, { timeout: 15000 });
}

async function openDepositModal(page: Page): Promise<void> {
  const depositCta = page.getByRole('button', { name: /Depositar|Configura tu crédito|Configurar crédito|Agregar fondos/i }).first();
  await depositCta.click();
  await expect(page.getByTestId('deposit-modal')).toBeVisible({ timeout: 10000 });
}

test.describe('Wallet - Deposit modal', () => {
  test.beforeEach(async ({ page }) => {
    await ensureRenterAuth(page);
    await page.goto('/wallet');
    await page.waitForLoadState('domcontentloaded');
  });

  test('shows validation when amount is below the minimum', async ({ page }) => {
    await openDepositModal(page);

    const amountInput = page.getByTestId('deposit-amount-input');
    await amountInput.fill('50'); // MIN is 100 ARS

    const submit = page.getByRole('button', { name: /continuar al pago|continuar|confirmar/i }).last();
    await submit.click();

    const errorAlert = page.getByRole('alert');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/mínim|100/i);
  });
});
