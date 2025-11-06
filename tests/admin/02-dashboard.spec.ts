import { test, expect } from '@playwright/test';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin Test: Dashboard Metrics
 *
 * Tests admin dashboard statistics display.
 *
 * Pre-requisites:
 * - Admin user authenticated (via setup:admin)
 * - Database contains test data (profiles, cars, bookings, etc.)
 *
 * Test Coverage:
 * - Display all statistics correctly
 * - Statistics match database counts
 * - Dashboard loads without errors
 */

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

test.describe('Admin - Dashboard Metrics', () => {
  let adminPage: AdminDashboardPage;

  test.beforeEach(async ({ page }) => {
    adminPage = new AdminDashboardPage(page);
  });

  test('should display all statistics on dashboard', async () => {
    await adminPage.goto();
    await adminPage.waitForStatsLoad();

    // Get stats from dashboard
    const stats = await adminPage.getStats();

    // Verify all stats are present and non-negative
    expect(stats.totalProfiles).toBeGreaterThanOrEqual(0);
    expect(stats.totalCars).toBeGreaterThanOrEqual(0);
    expect(stats.totalPhotos).toBeGreaterThanOrEqual(0);
    expect(stats.totalBookings).toBeGreaterThanOrEqual(0);

    console.log('📊 Dashboard Statistics:');
    console.log(`  - Total Profiles: ${stats.totalProfiles}`);
    console.log(`  - Total Cars: ${stats.totalCars}`);
    console.log(`  - Total Photos: ${stats.totalPhotos}`);
    console.log(`  - Total Bookings: ${stats.totalBookings}`);
  });

  test('should match profiles count with database', async () => {
    await adminPage.goto();
    await adminPage.waitForStatsLoad();

    // Get count from dashboard
    const dashboardStats = await adminPage.getStats();

    // Get count from database
    const { count: dbCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    expect(dashboardStats.totalProfiles).toBe(dbCount || 0);
    console.log(`✅ Profiles count matches: Dashboard=${dashboardStats.totalProfiles}, DB=${dbCount}`);
  });

  test('should match cars count with database', async () => {
    await adminPage.goto();
    await adminPage.waitForStatsLoad();

    // Get count from dashboard
    const dashboardStats = await adminPage.getStats();

    // Get total cars count from database
    const { count: totalCars } = await supabase
      .from('cars')
      .select('*', { count: 'exact', head: true });

    // Get active cars count from database
    const { count: activeCars } = await supabase
      .from('cars')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    expect(dashboardStats.totalCars).toBe(totalCars || 0);
    console.log(`✅ Total cars count matches: Dashboard=${dashboardStats.totalCars}, DB=${totalCars}`);
    console.log(`   Active cars: ${dashboardStats.activeCars} (DB: ${activeCars})`);
  });

  test('should match bookings count with database', async () => {
    await adminPage.goto();
    await adminPage.waitForStatsLoad();

    // Get count from dashboard
    const dashboardStats = await adminPage.getStats();

    // Get count from database
    const { count: dbCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    expect(dashboardStats.totalBookings).toBe(dbCount || 0);
    console.log(`✅ Bookings count matches: Dashboard=${dashboardStats.totalBookings}, DB=${dbCount}`);
  });

  test('should match photos count with database', async () => {
    await adminPage.goto();
    await adminPage.waitForStatsLoad();

    // Get count from dashboard
    const dashboardStats = await adminPage.getStats();

    // Get count from database
    const { count: dbCount } = await supabase
      .from('car_photos')
      .select('*', { count: 'exact', head: true });

    expect(dashboardStats.totalPhotos).toBe(dbCount || 0);
    console.log(`✅ Photos count matches: Dashboard=${dashboardStats.totalPhotos}, DB=${dbCount}`);
  });

  test('should load dashboard without errors', async () => {
    const errors: string[] = [];

    // Listen for console errors
    adminPage.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Listen for page errors
    adminPage.page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await adminPage.goto();
    await adminPage.waitForStatsLoad();

    // Check for critical errors (ignore minor warnings)
    const criticalErrors = errors.filter((err) =>
      err.toLowerCase().includes('error') && !err.includes('favicon')
    );

    expect(criticalErrors.length).toBe(0);
    if (criticalErrors.length > 0) {
      console.error('❌ Dashboard errors:', criticalErrors);
    } else {
      console.log('✅ Dashboard loaded without errors');
    }
  });

  test('should display page title correctly', async () => {
    await adminPage.goto();

    const title = await adminPage.page.locator('h1').first().textContent();
    expect(title).toContain('Panel de Administración');
    console.log(`✅ Page title: "${title}"`);
  });
});
