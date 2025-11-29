import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  const authFile = 'tests/.auth/renter.json';

  console.log('🌍 Ejecutando Global Setup...');

  // Usamos un navegador temporal para hacer el login (UI por ahora, API idealmente)
  // Esto es más robusto que intentar replicar toda la criptografía de auth de Supabase manualmente
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  try {
    console.log('🔐 Iniciando autenticación global para Renter...');

    // 1. Ir al login
    await page.goto('/auth/login');

    // 2. Llenar credenciales
    await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });

    const emailInput = page.getByPlaceholder(/email|correo/i)
      .or(page.locator('input[type="email"]'))
      .or(page.locator('input[name="email"]'))
      .first();

    const passwordInput = page.getByPlaceholder(/contraseña|password/i)
      .or(page.locator('input[type="password"]'))
      .or(page.locator('input[name="password"]'))
      .first();

    await emailInput.fill('test-renter@autorenta.com');
    await passwordInput.fill('TestPassword123!');

    // 3. Submit
    const loginButton = page.getByRole('button', { name: /entrar|iniciar/i })
      .or(page.locator('button[type="submit"]'))
      .first();

    // Check for Vite error overlay
    const overlay = page.locator('vite-error-overlay');
    if (await overlay.isVisible()) {
      console.error('🚨 Vite Error Overlay detected!');
      const errorText = await overlay.evaluate(el => el.shadowRoot?.textContent || el.textContent);
      console.error('Overlay content:', errorText);

      // Try to hide it to proceed
      await page.addStyleTag({ content: 'vite-error-overlay { display: none !important; }' });
    }

    await loginButton.click();

    // 4. Esperar a que el login sea exitoso (redirección o elemento de UI)
    await page.waitForURL(/\/cars|\//);

    // Esperar a que aparezca el menú de usuario para confirmar sesión (attached es suficiente si está en un dropdown)
    await page.waitForSelector('[data-testid="user-menu"], a[href="/profile"]', { state: 'attached', timeout: 15000 });

    // 5. Guardar el estado (cookies, localStorage)
    await page.context().storageState({ path: authFile });
    console.log(`✅ Estado de autenticación Renter guardado en ${authFile}`);

    // ============================================
    // OWNER AUTH - Segunda sesión para tests de owner (OPCIONAL)
    // Requiere que el owner exista en Supabase (via runOwnerSeed con SUPABASE_SERVICE_ROLE_KEY)
    // ============================================
    try {
      console.log('🔐 Iniciando autenticación global para Owner...');

      // Crear nuevo CONTEXTO limpio (no solo nueva página) para evitar sesión de renter
      const ownerContext = await browser.newContext({ baseURL });
      const ownerPage = await ownerContext.newPage();
      const ownerAuthFile = 'tests/.auth/owner.json';

      await ownerPage.goto('/auth/login');
      await ownerPage.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });

      const ownerEmailInput = ownerPage.getByPlaceholder(/email|correo/i)
        .or(ownerPage.locator('input[type="email"]'))
        .or(ownerPage.locator('input[name="email"]'))
        .first();

      const ownerPasswordInput = ownerPage.getByPlaceholder(/contraseña|password/i)
        .or(ownerPage.locator('input[type="password"]'))
        .or(ownerPage.locator('input[name="password"]'))
        .first();

      // Credenciales del owner (creado por runOwnerSeed)
      await ownerEmailInput.fill('owner.dashboard@example.com');
      await ownerPasswordInput.fill('TestOwnerDashboard123!');

      const ownerLoginButton = ownerPage.getByRole('button', { name: /entrar|iniciar/i })
        .or(ownerPage.locator('button[type="submit"]'))
        .first();

      await ownerLoginButton.click();
      await ownerPage.waitForURL(/\/cars|\//, { timeout: 15000 });
      await ownerPage.waitForSelector('[data-testid="user-menu"], a[href="/profile"]', { state: 'attached', timeout: 10000 });

      await ownerContext.storageState({ path: ownerAuthFile });
      console.log(`✅ Estado de autenticación Owner guardado en ${ownerAuthFile}`);

      await ownerContext.close();
    } catch (ownerError) {
      console.warn('⚠️ Owner auth falló (usuario puede no existir). Tests de owner usarán login manual.');
      console.warn('   Para habilitar: configure SUPABASE_SERVICE_ROLE_KEY y ejecute runOwnerSeed()');
    }

  } catch (error) {
    console.error('❌ Error en Global Setup:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
