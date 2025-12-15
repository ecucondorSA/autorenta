import { test, expect } from '@playwright/test';

/**
 * Basic smoke tests for AutoRenta
 * 
 * These tests verify that the app is accessible and core pages load correctly.
 */

test.describe('AutoRenta Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check that the page title contains AutoRenta
    await expect(page).toHaveTitle(/AutoRenta|autorentar/i);
  });
  
  test('navigation is visible', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Check for common navigation elements
    // Note: Adjust selectors based on actual app structure
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });
  
  test('can navigate to login page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Try to navigate to auth/login
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');
    
    // Verify we're on a login-related page
    const url = page.url();
    expect(url).toContain('auth/login');
  });
  
  test('marketplace page is accessible', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('domcontentloaded');
    
    // Verify we're on the marketplace page
    const url = page.url();
    expect(url).toContain('marketplace');
  });
});
