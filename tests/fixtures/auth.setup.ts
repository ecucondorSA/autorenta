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

const supabaseUrl =
  process.env.NG_APP_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.PLAYWRIGHT_SUPABASE_URL ||
  '';
const supabaseAnonKey =
  process.env.NG_APP_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.PLAYWRIGHT_SUPABASE_ANON_KEY ||
  '';
const baseUrl =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.E2E_WEB_URL ||
  process.env.WEB_URL ||
  'http://127.0.0.1:4200';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase envs missing: set NG_APP_SUPABASE_URL & NG_APP_SUPABASE_ANON_KEY (or SUPABASE_URL/SUPABASE_ANON_KEY)'
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test user credentials (from seed data)
// Usar test-renter@autorenta.com que ya existe en la base de datos
const testUsers = {
  renter: {
    email: process.env.TEST_RENTER_EMAIL || 'renter.test@autorenta.com',
    password: process.env.TEST_RENTER_PASSWORD || 'TestRenter123!',
    role: 'locatario',
  },
  owner: {
    email: process.env.TEST_OWNER_EMAIL || 'owner.test@autorenta.com',
    password: process.env.TEST_OWNER_PASSWORD || 'TestOwner123!',
    role: 'locador',
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin.test@autorenta.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!',
    role: 'admin',
  },
};

// Paths for storing auth states
const authFiles = {
  renter: 'tests/.auth/renter.json',
  owner: 'tests/.auth/owner.json',
  admin: 'tests/.auth/admin.json',
};

const setSupabaseSessionInBrowser = async (page: any, session: any) => {
  await page.evaluate(
    ({ session: s, supabaseUrl: url }) => {
      const serialized = JSON.stringify(s);
      localStorage.setItem('supabase.auth.token', serialized);
      sessionStorage.setItem('supabase.auth.token', serialized);

      try {
        const projectRef = new URL(url).hostname.split('.')[0];
        const key = `sb-${projectRef}-auth-token`;
        localStorage.setItem(key, serialized);
      } catch (e) {
        console.error('Failed to derive projectRef for auth token key', e);
      }
    },
    { session, supabaseUrl }
  );
};

const gotoHome = async (page: any) => {
  await page.goto(baseUrl);
  await page.waitForLoadState('domcontentloaded');
};

const verifyAuthenticated = async (page: any, role: string) => {
  await page.waitForTimeout(3000);
  await page.goto(`${baseUrl}/cars`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  const loginButton = page
    .locator('a[routerLink="/auth/login"]')
    .or(page.getByRole('link', { name: /entrar|login|iniciar sesión/i }));
  const profileLink = page.locator('a[routerLink="/profile"]').or(page.locator('a[href="/profile"]'));
  const verificationBadge = page.locator('app-verification-badge');

  const [loginButtonVisible, profileLinkVisible, badgeVisible] = await Promise.all([
    loginButton.isVisible({ timeout: 5000 }).catch(() => false),
    profileLink.isVisible({ timeout: 5000 }).catch(() => false),
    verificationBadge.isVisible({ timeout: 5000 }).catch(() => false),
  ]);

  const currentUrl = page.url();
  const isOnLoginPage = currentUrl.includes('/auth/login');
  const isAuthenticated =
    (profileLinkVisible && !loginButtonVisible) || badgeVisible || (!isOnLoginPage && !loginButtonVisible);

  if (!isAuthenticated) {
    throw new Error(
      `Autenticación fallida para ${role}. URL actual: ${currentUrl}. profile:${profileLinkVisible} login:${loginButtonVisible}`
    );
  }
};

/**
 * Setup authenticated renter session
 */
setup('authenticate as renter', async ({ page }) => {
  console.log('Setting up renter authentication...');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: testUsers.renter.email,
    password: testUsers.renter.password,
  });

  if (error) {
    throw new Error(`Renter login failed: ${error.message}`);
  }

  expect(data.user).toBeTruthy();
  expect(data.session).toBeTruthy();

  await gotoHome(page);
  await setSupabaseSessionInBrowser(page, data.session);
  await page.reload();
  await verifyAuthenticated(page, 'renter');

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

  await gotoHome(page);
  await setSupabaseSessionInBrowser(page, data.session);
  await page.reload();
  await verifyAuthenticated(page, 'owner');

  await page.context().storageState({ path: authFiles.owner });
  console.log('✅ Owner authenticated and state saved');
});

/**
 * Setup authenticated admin session
 */
setup('authenticate as admin', async ({ page }) => {
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

  await gotoHome(page);
  await setSupabaseSessionInBrowser(page, data.session);
  await page.reload();
  await verifyAuthenticated(page, 'admin');

  await page.context().storageState({ path: authFiles.admin });
  console.log('✅ Admin authenticated and state saved');
});
