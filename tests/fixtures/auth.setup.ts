import { test as setup, expect } from '@playwright/test';
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
const testUsers = {
  renter: {
    email: 'renter.test@autorenta.com',
    password: 'TestRenter123!',
    role: 'locatario',
  },
  owner: {
    email: 'owner.test@autorenta.com',
    password: 'TestOwner123!',
    role: 'locador',
  },
  admin: {
    email: 'admin.test@autorenta.com',
    password: 'TestAdmin123!',
    role: 'admin',
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
  await page.evaluate((session) => {
    localStorage.setItem('supabase.auth.token', JSON.stringify(session));
  }, data.session);

  // Verify auth state
  await page.goto('/cars');
  await expect(page.getByTestId('user-menu')).toBeVisible({ timeout: 10000 });

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

  await page.goto('/');
  await page.evaluate((session) => {
    localStorage.setItem('supabase.auth.token', JSON.stringify(session));
  }, data.session);

  await page.goto('/cars/publish');
  await expect(page.getByTestId('publish-form')).toBeVisible({ timeout: 10000 });

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

  await page.goto('/');
  await page.evaluate((session) => {
    localStorage.setItem('supabase.auth.token', JSON.stringify(session));
  }, data.session);

  await page.goto('/admin');
  await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 10000 });

  await page.context().storageState({ path: authFiles.admin });
  console.log('✅ Admin authenticated and state saved');
});
