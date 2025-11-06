import { Page, expect, Locator } from '@playwright/test';

/**
 * Admin Dashboard Page Object
 *
 * Handles admin dashboard interactions:
 * - View database statistics
 * - List pending cars
 * - Approve cars
 */
export class AdminDashboardPage {
  readonly page: Page;

  // Statistics locators
  readonly totalProfilesStat: Locator;
  readonly totalCarsStat: Locator;
  readonly totalPhotosStat: Locator;
  readonly totalBookingsStat: Locator;

  // Pending cars section
  readonly pendingCarsHeader: Locator;
  readonly carCards: Locator;
  readonly approveButtons: Locator;
  readonly noPendingMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Statistics - using text content as identifiers
    this.totalProfilesStat = page.locator('text=Usuarios Registrados').locator('..').locator('p.text-3xl');
    this.totalCarsStat = page.locator('text=Total de Autos').locator('..').locator('p.text-3xl');
    this.totalPhotosStat = page.locator('text=Fotos de Autos').locator('..').locator('p.text-3xl');
    this.totalBookingsStat = page.locator('text=Reservas').locator('..').locator('p.text-3xl');

    // Pending cars
    this.pendingCarsHeader = page.locator('h2:has-text("Autos Pendientes de Aprobación")');
    this.carCards = page.locator('app-car-card');
    this.approveButtons = page.locator('button:has-text("Aprobar auto")');
    this.noPendingMessage = page.locator('text=No hay autos pendientes de aprobación');
    this.successMessage = page.locator('p.bg-blue-50');
  }

  /**
   * Navigate to admin dashboard
   */
  async goto(): Promise<void> {
    await this.page.goto('/admin');
    await expect(this.page.locator('h1:has-text("Panel de Administración")')).toBeVisible();
  }

  /**
   * Get statistics from the dashboard
   */
  async getStats(): Promise<{
    totalProfiles: number;
    totalCars: number;
    activeCars: number;
    totalPhotos: number;
    totalBookings: number;
  }> {
    await this.totalProfilesStat.waitFor({ state: 'visible' });

    const [profiles, cars, photos, bookings] = await Promise.all([
      this.totalProfilesStat.textContent(),
      this.totalCarsStat.textContent(),
      this.totalPhotosStat.textContent(),
      this.totalBookingsStat.textContent(),
    ]);

    // Get active cars count from the "X activos" text below totalCars
    const activeText = await this.totalCarsStat.locator('..').locator('p.text-xs').textContent();
    const activeMatch = activeText?.match(/(\d+)\s+activos/);
    const activeCars = activeMatch ? parseInt(activeMatch[1]) : 0;

    return {
      totalProfiles: parseInt(profiles?.trim() || '0'),
      totalCars: parseInt(cars?.trim() || '0'),
      activeCars: activeCars,
      totalPhotos: parseInt(photos?.trim() || '0'),
      totalBookings: parseInt(bookings?.trim() || '0'),
    };
  }

  /**
   * Get count of pending cars from header
   */
  async getPendingCarsCount(): Promise<number> {
    const headerText = await this.pendingCarsHeader.textContent();
    const match = headerText?.match(/\((\d+)\)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Check if there are pending cars
   */
  async hasPendingCars(): Promise<boolean> {
    const count = await this.carCards.count();
    return count > 0;
  }

  /**
   * Approve the first pending car
   */
  async approveFirstCar(): Promise<void> {
    const hasCars = await this.hasPendingCars();
    if (!hasCars) {
      throw new Error('No pending cars to approve');
    }

    // Click the first approve button
    await this.approveButtons.first().click();

    // Wait for success message
    await expect(this.successMessage).toBeVisible({ timeout: 10000 });
  }

  /**
   * Approve a specific car by index (0-based)
   */
  async approveCarByIndex(index: number): Promise<void> {
    const count = await this.approveButtons.count();
    if (index >= count) {
      throw new Error(`Car index ${index} out of range (${count} cars available)`);
    }

    await this.approveButtons.nth(index).click();
    await expect(this.successMessage).toBeVisible({ timeout: 10000 });
  }

  /**
   * Wait for statistics to load
   */
  async waitForStatsLoad(): Promise<void> {
    await this.totalProfilesStat.waitFor({ state: 'visible' });
    await this.totalCarsStat.waitFor({ state: 'visible' });
  }

  /**
   * Check if "no pending cars" message is visible
   */
  async isNoPendingMessageVisible(): Promise<boolean> {
    try {
      await this.noPendingMessage.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the count of visible car cards
   */
  async getVisibleCarCount(): Promise<number> {
    return await this.carCards.count();
  }
}
