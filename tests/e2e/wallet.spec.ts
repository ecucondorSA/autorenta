import { test, expect } from '@playwright/test';

test.describe('Wallet', () => {
  // Este hook se ejecuta antes de cada test, PERO ya estamos logueados
  test.beforeEach(async ({ page }) => {
    // Navegación directa: ¡Sin pasar por login!
    await page.goto('/wallet');
  });

  test('debe mostrar el saldo del usuario', async ({ page }) => {
    // Verificar que estamos en la página correcta
    await expect(page).toHaveURL(/.*wallet/);

    // Verificar que se muestra el balance (ajusta el selector a tu UI)
    // Usamos un selector genérico por ahora, puedes refinarlo con data-testid
    const balanceElement = page.locator('text=Balance'); 
    await expect(balanceElement).toBeVisible();
    
    // Ejemplo: Verificar que hay un botón de "Cargar Saldo"
    await expect(page.getByRole('button', { name: /cargar|top up/i })).toBeVisible();
  });

  test('debe listar transacciones recientes', async ({ page }) => {
    // Verificar que hay una lista de transacciones
    // Asumiendo que tienes items en una lista
    const transactions = page.locator('.transaction-item, ion-item'); 
    
    // Si es un usuario nuevo podría no tener, así que verificamos contenedor o mensaje "sin transacciones"
    // await expect(transactions.first()).toBeVisible(); 
  });
});
