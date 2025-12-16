import { test as base } from '@playwright/test';

/**
 * Custom test fixtures for AutoRenta e2e tests
 * 
 * This file can be extended with custom fixtures like:
 * - Authenticated user sessions
 * - Test data setup/teardown
 * - Database seeding
 * - Mock API responses
 */

type AutoRentaFixtures = {
  // Add custom fixtures here
  // Example:
  // authenticatedPage: Page;
};

export const test = base.extend<AutoRentaFixtures>({
  // Define custom fixtures here
  // Example:
  // authenticatedPage: async ({ page }, use) => {
  //   // Setup: login user
  //   await page.goto('/auth/login');
  //   // ... perform login
  //   await use(page);
  //   // Teardown: logout if needed
  // },
});

export { expect } from '@playwright/test';
