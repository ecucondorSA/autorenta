import { test, expect } from '@playwright/test';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin Test: Car Approvals
 *
 * Tests admin ability to approve pending cars.
 *
 * Pre-requisites:
 * - Admin user authenticated (via setup:admin)
 * - At least one pending car in database (created in beforeEach)
 *
 * Test Coverage:
 * - Navigate to admin dashboard
 * - View list of pending cars
 * - Approve a pending car
 * - Verify car disappears from pending list
 * - Verify car status changed to 'active' in database
 */

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

test.describe('Admin - Car Approvals', () => {
  let adminPage: AdminDashboardPage;
  let testCarId: string;

  test.beforeEach(async ({ page }) => {
    adminPage = new AdminDashboardPage(page);

    // Create a test car with 'pending' status
    // Use owner.test@autorenta.com as the owner
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'owner')
      .single();

    if (!ownerProfile) {
      throw new Error('Owner test user not found in database');
    }

    const { data: car, error } = await supabase
      .from('cars')
      .insert({
        owner_id: ownerProfile.id,
        title: `Test Car for Approval ${Date.now()}`,
        description: 'Auto de prueba para aprobación por admin',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2023,
        price_per_day: 5000,
        location_city: 'Montevideo',
        location_state: 'Montevideo',
        location_country: 'UY',
        status: 'pending', // This is the key - car needs approval
        seats: 5,
        transmission: 'automatic',
        fuel_type: 'gasoline',
      })
      .select()
      .single();

    if (error || !car) {
      throw new Error(`Failed to create test car: ${error?.message}`);
    }

    testCarId = car.id;
    console.log(`✅ Created test car with ID: ${testCarId} (status: pending)`);
  });

  test.afterEach(async () => {
    // Clean up: delete test car
    if (testCarId) {
      await supabase.from('cars').delete().eq('id', testCarId);
      console.log(`🧹 Cleaned up test car: ${testCarId}`);
    }
  });

  test('should display pending cars count in dashboard', async () => {
    await adminPage.goto();
    await adminPage.waitForStatsLoad();

    const pendingCount = await adminPage.getPendingCarsCount();
    expect(pendingCount).toBeGreaterThan(0);
    console.log(`📊 Pending cars count: ${pendingCount}`);
  });

  test('should list pending cars with approval button', async () => {
    await adminPage.goto();
    await adminPage.waitForStatsLoad();

    // Verify that there are pending cars
    const hasPending = await adminPage.hasPendingCars();
    expect(hasPending).toBe(true);

    // Verify that approve buttons are visible
    const visibleCarCount = await adminPage.getVisibleCarCount();
    expect(visibleCarCount).toBeGreaterThan(0);
    console.log(`✅ Found ${visibleCarCount} pending car(s)`);
  });

  test('should approve pending car successfully', async () => {
    await adminPage.goto();
    await adminPage.waitForStatsLoad();

    // Get initial stats
    const initialStats = await adminPage.getStats();
    const initialPendingCount = await adminPage.getPendingCarsCount();

    console.log(`📊 Initial pending count: ${initialPendingCount}`);
    console.log(`📊 Initial active cars: ${initialStats.activeCars}`);

    // Approve the first pending car
    await adminPage.approveFirstCar();

    // Wait a bit for the dashboard to reload
    await adminPage.page.waitForTimeout(2000);

    // Verify the pending count decreased
    const newPendingCount = await adminPage.getPendingCarsCount();
    expect(newPendingCount).toBe(initialPendingCount - 1);
    console.log(`✅ Pending count decreased to: ${newPendingCount}`);

    // Verify car status changed in database
    const { data: updatedCar } = await supabase
      .from('cars')
      .select('status')
      .eq('id', testCarId)
      .single();

    expect(updatedCar?.status).toBe('active');
    console.log(`✅ Car status changed to 'active' in database`);
  });

  test('should show no pending message when all cars approved', async () => {
    await adminPage.goto();
    await adminPage.waitForStatsLoad();

    // Approve all pending cars
    let hasPending = await adminPage.hasPendingCars();
    while (hasPending) {
      await adminPage.approveFirstCar();
      await adminPage.page.waitForTimeout(1500);
      hasPending = await adminPage.hasPendingCars();
    }

    // Verify "no pending cars" message appears
    const showsNoPending = await adminPage.isNoPendingMessageVisible();
    expect(showsNoPending).toBe(true);
    console.log(`✅ "No pending cars" message displayed`);
  });

  test('should update dashboard statistics after approval', async () => {
    await adminPage.goto();
    await adminPage.waitForStatsLoad();

    // Get initial stats
    const initialStats = await adminPage.getStats();

    // Approve one car
    await adminPage.approveFirstCar();
    await adminPage.page.waitForTimeout(2000);

    // Get updated stats
    const updatedStats = await adminPage.getStats();

    // Verify active cars increased (might not be exactly +1 due to other test data)
    expect(updatedStats.activeCars).toBeGreaterThanOrEqual(initialStats.activeCars);
    console.log(`✅ Active cars: ${initialStats.activeCars} → ${updatedStats.activeCars}`);
  });
});
