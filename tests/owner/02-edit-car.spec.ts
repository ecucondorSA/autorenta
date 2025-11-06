import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Owner Test: Edit Published Car
 *
 * Tests owner ability to edit a published car.
 *
 * Pre-requisites:
 * - Owner user authenticated (via setup:owner)
 * - At least one car owned by the test owner
 *
 * Test Coverage:
 * - Navigate to "My Cars" page
 * - Select a car to edit
 * - Modify car details (price, description)
 * - Save changes
 * - Verify changes persisted in database
 */

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

test.describe('Owner - Edit Car', () => {
  let testCarId: string;
  let ownerUserId: string;

  test.beforeEach(async ({ page }) => {
    // Get owner test user ID
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', '%owner.test%')
      .single();

    if (!ownerProfile) {
      throw new Error('Owner test user not found in database');
    }

    ownerUserId = ownerProfile.id;

    // Create a test car for the owner
    const { data: car, error } = await supabase
      .from('cars')
      .insert({
        owner_id: ownerUserId,
        title: `Test Car for Editing ${Date.now()}`,
        description: 'Original description for testing',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2023,
        price_per_day: 5000,
        location_city: 'Montevideo',
        location_state: 'Montevideo',
        location_country: 'UY',
        status: 'active',
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
    console.log(`✅ Created test car with ID: ${testCarId}`);
  });

  test.afterEach(async () => {
    // Clean up: delete test car
    if (testCarId) {
      await supabase.from('cars').delete().eq('id', testCarId);
      console.log(`🧹 Cleaned up test car: ${testCarId}`);
    }
  });

  test('should navigate to "My Cars" page', async ({ page }) => {
    await page.goto('/cars/mine');
    await expect(page.locator('h1, h2').filter({ hasText: /Mis (Autos|Vehículos)/i })).toBeVisible({
      timeout: 10000,
    });
    console.log('✅ Navigated to "My Cars" page');
  });

  test('should list owner cars', async ({ page }) => {
    await page.goto('/cars/mine');
    await page.waitForTimeout(2000);

    // Wait for cars to load
    const carCards = page.locator('app-car-card');
    const count = await carCards.count();

    expect(count).toBeGreaterThan(0);
    console.log(`✅ Found ${count} car(s) in "My Cars"`);
  });

  test('should navigate to edit car form', async ({ page }) => {
    await page.goto('/cars/mine');
    await page.waitForTimeout(2000);

    // Find "Edit" or "Editar" button for the first car
    const editButton = page.locator('button:has-text("Editar"), button:has-text("Edit")').first();

    // If button doesn't exist, try alternative selectors
    const buttonExists = await editButton.count();
    if (buttonExists === 0) {
      // Try clicking on the car card itself or look for an icon button
      const carCard = page.locator('app-car-card').first();
      await carCard.click();
      await page.waitForTimeout(1000);
    } else {
      await editButton.click();
    }

    // Should navigate to publish page with edit query param
    await expect(page).toHaveURL(/\/cars\/publish/, { timeout: 10000 });
    console.log('✅ Navigated to edit form');
  });

  test('should edit car price successfully', async ({ page }) => {
    // Navigate directly to edit form
    await page.goto(`/cars/publish?edit=${testCarId}`);
    await page.waitForTimeout(2000);

    // Find price input (various possible selectors)
    const priceInput = page.locator(
      'input[formControlName="price_per_day"], input[name="price_per_day"], input[placeholder*="precio" i]'
    ).first();

    // Wait for form to load
    await priceInput.waitFor({ state: 'visible', timeout: 10000 });

    // Get original price
    const originalPrice = await priceInput.inputValue();
    const newPrice = '7500';

    // Update price
    await priceInput.clear();
    await priceInput.fill(newPrice);

    // Submit form (find submit button)
    const submitButton = page.locator(
      'button[type="submit"]:has-text("Guardar"), button[type="submit"]:has-text("Actualizar"), button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("Update")'
    ).first();

    await submitButton.click();

    // Wait for save to complete
    await page.waitForTimeout(3000);

    // Verify change in database
    const { data: updatedCar } = await supabase
      .from('cars')
      .select('price_per_day')
      .eq('id', testCarId)
      .single();

    expect(updatedCar?.price_per_day).toBe(parseInt(newPrice));
    console.log(`✅ Price updated: ${originalPrice} → ${newPrice}`);
  });

  test('should edit car description successfully', async ({ page }) => {
    // Navigate directly to edit form
    await page.goto(`/cars/publish?edit=${testCarId}`);
    await page.waitForTimeout(2000);

    // Find description input/textarea
    const descInput = page.locator(
      'textarea[formControlName="description"], textarea[name="description"], textarea[placeholder*="descripción" i]'
    ).first();

    await descInput.waitFor({ state: 'visible', timeout: 10000 });

    const newDescription = `Updated description at ${new Date().toISOString()}`;

    // Update description
    await descInput.clear();
    await descInput.fill(newDescription);

    // Submit form
    const submitButton = page.locator(
      'button[type="submit"]:has-text("Guardar"), button[type="submit"]:has-text("Actualizar"), button[type="submit"]:has-text("Save")'
    ).first();

    await submitButton.click();
    await page.waitForTimeout(3000);

    // Verify change in database
    const { data: updatedCar } = await supabase
      .from('cars')
      .select('description')
      .eq('id', testCarId)
      .single();

    expect(updatedCar?.description).toContain('Updated description');
    console.log(`✅ Description updated successfully`);
  });

  test('should edit multiple car fields simultaneously', async ({ page }) => {
    await page.goto(`/cars/publish?edit=${testCarId}`);
    await page.waitForTimeout(2000);

    const newPrice = '8500';
    const newDescription = `Multi-field update test ${Date.now()}`;

    // Update price
    const priceInput = page.locator(
      'input[formControlName="price_per_day"], input[name="price_per_day"]'
    ).first();
    await priceInput.waitFor({ state: 'visible', timeout: 10000 });
    await priceInput.clear();
    await priceInput.fill(newPrice);

    // Update description
    const descInput = page.locator(
      'textarea[formControlName="description"], textarea[name="description"]'
    ).first();
    await descInput.clear();
    await descInput.fill(newDescription);

    // Submit
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    await page.waitForTimeout(3000);

    // Verify both changes in database
    const { data: updatedCar } = await supabase
      .from('cars')
      .select('price_per_day, description')
      .eq('id', testCarId)
      .single();

    expect(updatedCar?.price_per_day).toBe(parseInt(newPrice));
    expect(updatedCar?.description).toContain('Multi-field update');
    console.log('✅ Multiple fields updated successfully');
  });

  test('should verify edit persists after navigation', async ({ page }) => {
    // Edit car
    await page.goto(`/cars/publish?edit=${testCarId}`);
    await page.waitForTimeout(2000);

    const newPrice = '9500';
    const priceInput = page.locator('input[formControlName="price_per_day"]').first();
    await priceInput.waitFor({ state: 'visible', timeout: 10000 });
    await priceInput.clear();
    await priceInput.fill(newPrice);

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    await page.waitForTimeout(3000);

    // Navigate away
    await page.goto('/cars/mine');
    await page.waitForTimeout(2000);

    // Navigate back to edit
    await page.goto(`/cars/publish?edit=${testCarId}`);
    await page.waitForTimeout(2000);

    // Verify price is still the new value
    const priceValue = await priceInput.inputValue();
    expect(priceValue).toBe(newPrice);
    console.log(`✅ Edit persisted after navigation: ${priceValue}`);
  });
});
