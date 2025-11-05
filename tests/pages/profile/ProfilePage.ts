import { Page, expect, Locator } from '@playwright/test';

/**
 * Profile Page Object
 *
 * Handles profile page interactions:
 * - View profile information
 * - Edit profile (name, phone, address, etc.)
 * - Upload/delete avatar
 */
export class ProfilePage {
  readonly page: Page;

  // View mode locators
  readonly pageTitle: Locator;
  readonly editProfileButton: Locator;
  readonly fullNameDisplay: Locator;
  readonly phoneDisplay: Locator;
  readonly whatsappDisplay: Locator;
  readonly avatarImage: Locator;
  readonly changeAvatarButton: Locator;
  readonly deleteAvatarButton: Locator;

  // Edit mode locators
  readonly fullNameInput: Locator;
  readonly phoneInput: Locator;
  readonly whatsappInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // Messages
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // View mode
    this.pageTitle = page.locator('h1:has-text("Mi Perfil")');
    this.editProfileButton = page.locator('button:has-text("Editar perfil")');
    this.fullNameDisplay = page.locator('text=Nombre completo').locator('..').locator('p.text-base').first();
    this.phoneDisplay = page.locator('text=Teléfono').locator('..').locator('p.text-base').first();
    this.whatsappDisplay = page.locator('text=WhatsApp').locator('..').locator('p.text-base').first();
    this.avatarImage = page.locator('img[alt="Avatar"]');
    this.changeAvatarButton = page.locator('label:has-text("Cambiar foto")');
    this.deleteAvatarButton = page.locator('button:has-text("Eliminar foto")');

    // Edit mode
    this.fullNameInput = page.locator('input[formControlName="full_name"]');
    this.phoneInput = page.locator('input[formControlName="phone"]');
    this.whatsappInput = page.locator('input[formControlName="whatsapp"]');
    this.saveButton = page.locator('button[type="submit"]:has-text("Guardar cambios")');
    this.cancelButton = page.locator('button:has-text("Cancelar")').last();

    // Messages
    this.successMessage = page.locator('.bg-green-50, .info-card-petrol').first();
    this.errorMessage = page.locator('.bg-red-50, .info-card-warm').first();
  }

  /**
   * Navigate to profile page
   */
  async goto(): Promise<void> {
    await this.page.goto('/profile');
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
  }

  /**
   * Check if we're in edit mode
   */
  async isEditMode(): Promise<boolean> {
    try {
      await this.fullNameInput.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Click "Edit profile" button
   */
  async clickEditProfile(): Promise<void> {
    await this.editProfileButton.click();
    await expect(this.fullNameInput).toBeVisible();
  }

  /**
   * Get displayed profile information (view mode)
   */
  async getProfileInfo(): Promise<{
    fullName?: string;
    phone?: string;
    whatsapp?: string;
  }> {
    const info: { fullName?: string; phone?: string; whatsapp?: string } = {};

    try {
      info.fullName = (await this.fullNameDisplay.textContent())?.trim();
    } catch {
      // Field not present
    }

    try {
      info.phone = (await this.phoneDisplay.textContent())?.trim();
    } catch {
      // Field not present
    }

    try {
      info.whatsapp = (await this.whatsappDisplay.textContent())?.trim();
    } catch {
      // Field not present
    }

    return info;
  }

  /**
   * Edit profile information
   */
  async editProfile(data: {
    fullName?: string;
    phone?: string;
    whatsapp?: string;
  }): Promise<void> {
    // Make sure we're in edit mode
    const inEditMode = await this.isEditMode();
    if (!inEditMode) {
      await this.clickEditProfile();
    }

    // Fill form fields
    if (data.fullName !== undefined) {
      await this.fullNameInput.clear();
      await this.fullNameInput.fill(data.fullName);
    }

    if (data.phone !== undefined) {
      await this.phoneInput.clear();
      await this.phoneInput.fill(data.phone);
    }

    if (data.whatsapp !== undefined) {
      await this.whatsappInput.clear();
      await this.whatsappInput.fill(data.whatsapp);
    }

    // Save changes
    await this.saveButton.click();

    // Wait for success message or exit from edit mode
    try {
      await this.successMessage.waitFor({ state: 'visible', timeout: 10000 });
    } catch {
      // If no success message, check if we exited edit mode
      await expect(this.editProfileButton).toBeVisible({ timeout: 5000 });
    }
  }

  /**
   * Upload avatar image
   */
  async uploadAvatar(filePath: string): Promise<void> {
    // Get the file input (it's hidden inside the label)
    const fileInput = this.page.locator('input[type="file"][accept="image/*"]').first();

    // Set the file
    await fileInput.setInputFiles(filePath);

    // Wait for upload to complete (spinner should disappear)
    await this.page.waitForTimeout(2000); // Give it time to upload

    // Check if avatar image src changed or success message appeared
    try {
      await this.successMessage.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      // Success message might not appear, that's okay
    }
  }

  /**
   * Delete avatar
   */
  async deleteAvatar(): Promise<void> {
    await this.deleteAvatarButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if avatar is displayed
   */
  async hasAvatar(): Promise<boolean> {
    try {
      const src = await this.avatarImage.getAttribute('src');
      return src !== null && !src.includes('placeholder');
    } catch {
      return false;
    }
  }

  /**
   * Cancel editing
   */
  async cancelEdit(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.editProfileButton).toBeVisible();
  }

  /**
   * Check if success message is visible
   */
  async isSuccessMessageVisible(): Promise<boolean> {
    try {
      await this.successMessage.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if error message is visible
   */
  async isErrorMessageVisible(): Promise<boolean> {
    try {
      await this.errorMessage.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}
