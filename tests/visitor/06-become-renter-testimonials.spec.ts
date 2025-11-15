import { test, expect } from '@playwright/test';

/**
 * Become Renter Page - Testimonials Test
 *
 * This test verifies that the become-renter page displays all testimonials correctly,
 * including the newly added Diego Fernández testimonial.
 */

test.describe('Become Renter - Testimonials', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the become-renter page
    await page.goto('/become-renter');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display all four testimonials', async ({ page }) => {
    // Verify that the testimonials section exists
    const testimonialsSection = page.locator('[data-tour-step="testimonials"]');
    await expect(testimonialsSection).toBeVisible();

    // Check that all 4 testimonials are present by name
    await expect(page.getByText('María González')).toBeVisible();
    await expect(page.getByText('Carlos Pérez')).toBeVisible();
    await expect(page.getByText('Laura Martínez')).toBeVisible();
    await expect(page.getByText('Diego Fernández')).toBeVisible();
  });

  test('should display Diego Fernández testimonial with correct information', async ({ page }) => {
    // Find Diego's testimonial card
    const diegoCard = page.locator('.card-premium', { has: page.getByText('Diego Fernández') });
    
    // Verify Diego's information is displayed
    await expect(diegoCard.getByText('Diego Fernández')).toBeVisible();
    await expect(diegoCard.getByText('Mendoza')).toBeVisible();
    await expect(diegoCard.getByText('Ford Focus 2020')).toBeVisible();
    await expect(diegoCard.getByText('$95,000/mes')).toBeVisible();
    
    // Verify the quote is displayed
    await expect(diegoCard.getByText(/Empecé con un solo auto/i)).toBeVisible();
    
    // Verify 5-star rating (5 stars should be visible)
    const stars = diegoCard.locator('svg.text-yellow-400');
    await expect(stars).toHaveCount(5);
  });

  test('should display all testimonials with 5-star ratings', async ({ page }) => {
    // Get all testimonial cards
    const cards = page.locator('.card-premium');
    
    // Should have 4 testimonials
    await expect(cards).toHaveCount(4);
    
    // Each card should have 5 stars
    for (let i = 0; i < 4; i++) {
      const card = cards.nth(i);
      const stars = card.locator('svg.text-yellow-400');
      await expect(stars).toHaveCount(5);
    }
  });

  test('should display testimonials in responsive grid layout', async ({ page }) => {
    const testimonialsGrid = page.locator('[data-tour-step="testimonials"]');
    
    // Check that the grid has the correct classes for responsive layout
    const gridClasses = await testimonialsGrid.getAttribute('class');
    expect(gridClasses).toContain('grid');
    expect(gridClasses).toContain('md:grid-cols-2');
    expect(gridClasses).toContain('lg:grid-cols-4');
  });

  test('should display earnings for all testimonials', async ({ page }) => {
    // Verify earnings are displayed for all testimonials
    await expect(page.getByText('$120,000/mes')).toBeVisible(); // María
    await expect(page.getByText('$80,000/mes')).toBeVisible();  // Carlos
    await expect(page.getByText('$150,000/mes')).toBeVisible(); // Laura
    await expect(page.getByText('$95,000/mes')).toBeVisible();  // Diego
  });
});
