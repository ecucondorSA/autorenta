import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const authFile = path.join(__dirname, '../../.auth/user.json');

setup('autenticar', async ({ page }) => {
  // Obtener credenciales de entorno o usar defaults para desarrollo local
  const email = process.env.TEST_USER_EMAIL || 'renter@test.com';
  const password = process.env.TEST_USER_PASSWORD || '123456';

  console.log(`🔐 Iniciando sesión como: ${email}...`);

  // 1. Ir al login
  await page.goto('/auth/login');

  // 2. Llenar formulario (ajustar selectores según tu UI real)
  // Intentamos ser resilientes usando roles o placeholders
  await page.getByLabel(/email|correo/i).fill(email);
  await page.getByLabel(/password|contraseña/i).fill(password);

  // 3. Click en Login
  await page.getByRole('button', { name: /iniciar|login|entrar/i }).click();

  // 4. Esperar a que el login sea exitoso
  // Una buena señal es que la URL cambie o aparezca un elemento de usuario
  await page.waitForURL('**/home/**', { timeout: 15000 });
  
  // Opcional: Verificar que aparezca el avatar o menú de usuario
  // await expect(page.getByTestId('user-menu')).toBeVisible();

  console.log('✅ Login exitoso. Guardando estado...');

  // 5. Guardar cookies y localStorage en el archivo
  await page.context().storageState({ path: authFile });
});
