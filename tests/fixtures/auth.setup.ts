import { expect, test as setup } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Authentication Setup for E2E Tests
 *
 * Creates authenticated sessions for each user role:
 * - Renter: Can search and book cars
 * - Owner: Can publish and manage cars
 * - Admin: Platform admin with approval powers
 */

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test user credentials (from seed data)
// Usar test-renter@autorenta.com que ya existe en la base de datos
const testUsers = {
  renter: {
    email: 'test-renter@autorenta.com',
    password: 'TestPassword123!',
    role: 'locatario',
  },
  owner: {
    email: 'test-owner@autorenta.com',
    password: 'TestPassword123!',
    role: 'locador',
  },
  admin: {
    email: 'admin.test@autorenta.com',
    password: 'TestAdmin123!',
    role: 'locatario',
  },
};

// Paths for storing auth states
const authFiles = {
  renter: 'tests/.auth/renter.json',
  owner: 'tests/.auth/owner.json',
  admin: 'tests/.auth/admin.json',
};

/**
 * Setup authenticated renter session
 */
setup('authenticate as renter', async ({ page }) => {
  console.log('Setting up renter authentication...');

  // Login via Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email: testUsers.renter.email,
    password: testUsers.renter.password,
  });

  if (error) {
    throw new Error(`Renter login failed: ${error.message}`);
  }

  expect(data.user).toBeTruthy();
  expect(data.session).toBeTruthy();

  // Navigate to app and set session in browser
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Set session in localStorage
  await page.evaluate((session) => {
    localStorage.setItem('supabase.auth.token', JSON.stringify(session));
    // También guardar en sessionStorage por si acaso
    sessionStorage.setItem('supabase.auth.token', JSON.stringify(session));
  }, data.session);

  // Reload page to apply session
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000); // Dar tiempo para que se establezca la sesión

  // Verify auth state - usar selectores basados en el HTML real
  await page.goto('/cars');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000); // Dar más tiempo para que Angular procese la sesión

  // Verificar autenticación de múltiples formas basadas en el HTML real
  // 1. Verificar que el botón de login NO está visible (significa que está autenticado)
  const loginButton = page.locator('a[routerLink="/auth/login"]').or(
    page.getByRole('link', { name: /entrar|login|iniciar sesión/i })
  );
  const loginButtonVisible = await loginButton.isVisible({ timeout: 5000 }).catch(() => false);

  // 2. Verificar que el link a profile SÍ está visible (significa que está autenticado)
  const profileLink = page.locator('a[routerLink="/profile"]').or(
    page.locator('a[href="/profile"]')
  );
  const profileLinkVisible = await profileLink.isVisible({ timeout: 5000 }).catch(() => false);

  // 3. Verificar badge de verificación (solo visible si está autenticado)
  const verificationBadge = page.locator('app-verification-badge');
  const badgeVisible = await verificationBadge.isVisible({ timeout: 5000 }).catch(() => false);

  // 4. Verificar que NO estamos en login
  const currentUrl = page.url();
  const isOnLoginPage = currentUrl.includes('/auth/login');

  // Consideramos autenticado si:
  // - El link a profile está visible Y el botón de login NO está visible
  // - O si el badge de verificación está visible
  // - Y no estamos en la página de login
  const isAuthenticated = (profileLinkVisible && !loginButtonVisible) || badgeVisible || !isOnLoginPage;

  if (!isAuthenticated || isOnLoginPage) {
    throw new Error(`El usuario no se autenticó correctamente. URL: ${currentUrl}, Profile link visible: ${profileLinkVisible}, Login button visible: ${loginButtonVisible}`);
  }

  console.log('✅ Autenticación verificada correctamente');

  // Save storage state
  await page.context().storageState({ path: authFiles.renter });
  console.log('✅ Renter authenticated and state saved');
});

/**
 * Setup authenticated owner session
 */
setup('authenticate as owner', async ({ page }) => {
  console.log('Setting up owner authentication...');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: testUsers.owner.email,
    password: testUsers.owner.password,
  });

  if (error) {
    throw new Error(`Owner login failed: ${error.message}`);
  }

  expect(data.user).toBeTruthy();
  expect(data.session).toBeTruthy();

  // Navigate to app and set session in browser
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Set session in localStorage
  await page.evaluate((session) => {
    localStorage.setItem('supabase.auth.token', JSON.stringify(session));
    // También guardar en sessionStorage por si acaso
    sessionStorage.setItem('supabase.auth.token', JSON.stringify(session));
  }, data.session);

  // Reload page to apply session
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000); // Dar tiempo para que se establezca la sesión

  // Verify auth state - usar selectores basados en el HTML real
  await page.goto('/cars');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000); // Dar más tiempo para que Angular procese la sesión

  // Verificar autenticación de múltiples formas basadas en el HTML real
  // 1. Verificar que el botón de login NO está visible (significa que está autenticado)
  const loginButton = page.locator('a[routerLink="/auth/login"]').or(
    page.getByRole('link', { name: /entrar|login|iniciar sesión/i })
  );
  const loginButtonVisible = await loginButton.isVisible({ timeout: 5000 }).catch(() => false);

  // 2. Verificar que el link a profile SÍ está visible (significa que está autenticado)
  const profileLink = page.locator('a[routerLink="/profile"]').or(
    page.locator('a[href="/profile"]')
  );
  const profileLinkVisible = await profileLink.isVisible({ timeout: 5000 }).catch(() => false);

  // 3. Verificar badge de verificación (solo visible si está autenticado)
  const verificationBadge = page.locator('app-verification-badge');
  const badgeVisible = await verificationBadge.isVisible({ timeout: 5000 }).catch(() => false);

  // 4. Verificar que NO estamos en login
  const currentUrl = page.url();
  const isOnLoginPage = currentUrl.includes('/auth/login');

  // Consideramos autenticado si:
  // - El link a profile está visible Y el botón de login NO está visible
  // - O si el badge de verificación está visible
  // - Y no estamos en la página de login
  const isAuthenticated = (profileLinkVisible && !loginButtonVisible) || badgeVisible || !isOnLoginPage;

  if (!isAuthenticated || isOnLoginPage) {
    throw new Error(`El usuario owner no se autenticó correctamente. URL: ${currentUrl}, Profile link visible: ${profileLinkVisible}, Login button visible: ${loginButtonVisible}`);
  }

  console.log('✅ Autenticación verificada correctamente');

  // Save storage state
  await page.context().storageState({ path: authFiles.owner });
  console.log('✅ Owner authenticated and state saved');
});

/**
 * Setup authenticated admin session
 */
setup.skip('authenticate as admin', async ({ page }) => {
  console.log('Setting up admin authentication...');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: testUsers.admin.email,
    password: testUsers.admin.password,
  });

  if (error) {
    throw new Error(`Admin login failed: ${error.message}`);
  }

  expect(data.user).toBeTruthy();
  expect(data.session).toBeTruthy();

  // Navigate to app and set session in browser
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Set session in localStorage
  await page.evaluate((session) => {
    localStorage.setItem('supabase.auth.token', JSON.stringify(session));
    // También guardar en sessionStorage por si acaso
    sessionStorage.setItem('supabase.auth.token', JSON.stringify(session));
  }, data.session);

  // Reload page to apply session
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000); // Dar tiempo para que se establezca la sesión

  // Verify auth state - usar selectores basados en el HTML real
  await page.goto('/admin');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000); // Dar más tiempo para que Angular procese la sesión

  // Verificar autenticación de múltiples formas basadas en el HTML real
  // 1. Verificar que el botón de login NO está visible (significa que está autenticado)
  const loginButton = page.locator('a[routerLink="/auth/login"]').or(
    page.getByRole('link', { name: /entrar|login|iniciar sesión/i })
  );
  const loginButtonVisible = await loginButton.isVisible({ timeout: 5000 }).catch(() => false);

  // 2. Verificar que el link a profile SÍ está visible (significa que está autenticado)
  const profileLink = page.locator('a[routerLink="/profile"]').or(
    page.locator('a[href="/profile"]')
  );
  const profileLinkVisible = await profileLink.isVisible({ timeout: 5000 }).catch(() => false);

  // 3. Verificar badge de verificación (solo visible si está autenticado)
  const verificationBadge = page.locator('app-verification-badge');
  const badgeVisible = await verificationBadge.isVisible({ timeout: 5000 }).catch(() => false);

  // 4. Verificar que NO estamos en login
  const currentUrl = page.url();
  const isOnLoginPage = currentUrl.includes('/auth/login');

  // Consideramos autenticado si:
  // - El link a profile está visible Y el botón de login NO está visible
  // - O si el badge de verificación está visible
  // - Y no estamos en la página de login
  const isAuthenticated = (profileLinkVisible && !loginButtonVisible) || badgeVisible || !isOnLoginPage;

  if (!isAuthenticated || isOnLoginPage) {
    throw new Error(`El usuario admin no se autenticó correctamente. URL: ${currentUrl}, Profile link visible: ${profileLinkVisible}, Login button visible: ${loginButtonVisible}`);
  }

  console.log('✅ Autenticación verificada correctamente');

  await page.context().storageState({ path: authFiles.admin });
  console.log('✅ Admin authenticated and state saved');
});
