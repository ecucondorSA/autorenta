/**
 * BasePage - Clase base para todos los Page Objects
 *
 * Proporciona funcionalidad común para todas las páginas:
 * - Navegación
 * - Esperas inteligentes
 * - Manejo de errores
 * - Screenshots
 */

import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  protected readonly page: Page;
  protected readonly url: string;

  constructor(page: Page, url: string = '') {
    this.page = page;
    this.url = url;
  }

  /**
   * Navega a la página
   */
  async goto(): Promise<void> {
    if (this.url) {
      await this.page.goto(this.url);
      await this.waitForPageLoad();
    }
  }

  /**
   * Espera a que la página cargue completamente
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Espera a que un elemento esté visible
   */
  async waitForElement(locator: Locator, timeout: number = 10000): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Espera a que un elemento esté oculto
   */
  async waitForElementHidden(locator: Locator, timeout: number = 5000): Promise<void> {
    await locator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Click con espera automática
   */
  async clickAndWait(locator: Locator): Promise<void> {
    await this.waitForElement(locator);
    await locator.click();
  }

  /**
   * Fill con espera automática
   */
  async fillAndWait(locator: Locator, value: string): Promise<void> {
    await this.waitForElement(locator);
    await locator.fill(value);
  }

  /**
   * Verifica si un elemento está visible
   */
  async isElementVisible(locator: Locator, timeout: number = 5000): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene el texto de un elemento
   */
  async getElementText(locator: Locator): Promise<string> {
    await this.waitForElement(locator);
    return await locator.textContent() || '';
  }

  /**
   * Espera y maneja navegación
   */
  async clickAndNavigate(locator: Locator, urlPattern?: RegExp): Promise<void> {
    await Promise.all([
      this.page.waitForURL(urlPattern || /.*/, { timeout: 15000 }),
      locator.click()
    ]);
  }

  /**
   * Llena un campo de formulario por nombre o selector
   * Soporta tanto name como formControlName (Angular Reactive Forms)
   */
  async fillFormField(nameOrSelector: string, value: string): Promise<void> {
    // Buscar por name, formControlName, o selector directo
    const input = this.page.locator(
      `input[name="${nameOrSelector}"], ` +
      `textarea[name="${nameOrSelector}"], ` +
      `[name="${nameOrSelector}"], ` +
      `input[formControlName="${nameOrSelector}"], ` +
      `textarea[formControlName="${nameOrSelector}"], ` +
      `[formControlName="${nameOrSelector}"]`
    );
    await this.waitForElement(input);
    await input.fill(value);
  }

  /**
   * Selecciona una opción en un select o ion-select
   */
  async selectOption(nameOrSelector: string, value: string): Promise<void> {
    // Primero intentar con select HTML estándar
    const standardSelect = this.page.locator(`select[name="${nameOrSelector}"]`);
    if (await this.isElementVisible(standardSelect, 1000)) {
      await standardSelect.selectOption(value);
      return;
    }

    // Si no, intentar con ion-select (Ionic)
    const ionSelect = this.page.locator(`ion-select[name="${nameOrSelector}"]`);
    if (await this.isElementVisible(ionSelect, 1000)) {
      await ionSelect.click();
      await this.page.waitForTimeout(300); // Espera para animación
      const option = this.page.locator(`ion-popover ion-item:has-text("${value}")`);
      await option.click();
      await this.page.locator('ion-popover').waitFor({ state: 'hidden' });
    }
  }

  /**
   * Verifica si estamos autenticados
   */
  async isAuthenticated(): Promise<boolean> {
    const indicators = [
      '[data-testid="user-menu"]',
      'a[href*="/profile"]',
      'button:has-text("Mi Perfil")',
      'ion-menu-button'
    ];

    for (const indicator of indicators) {
      if (await this.isElementVisible(this.page.locator(indicator), 2000)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Obtiene mensajes de error de validación
   */
  async getValidationErrors(): Promise<string[]> {
    const errorSelectors = [
      '.error-message',
      '.validation-error',
      'ion-note.error',
      '[role="alert"]'
    ];

    const errors: string[] = [];
    for (const selector of errorSelectors) {
      const elements = await this.page.locator(selector).all();
      for (const element of elements) {
        const text = await element.textContent();
        if (text) errors.push(text.trim());
      }
    }

    return errors;
  }

  /**
   * Toma un screenshot de la página actual
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true
    });
  }

  /**
   * Espera para animaciones de Ionic
   */
  async waitForIonicAnimation(duration: number = 300): Promise<void> {
    await this.page.waitForTimeout(duration);
  }

  /**
   * Manejo de modales de Ionic
   */
  async waitForModal(timeout: number = 5000): Promise<void> {
    await this.page.locator('ion-modal[is-open="true"]').waitFor({
      state: 'visible',
      timeout
    });
  }

  async closeModal(): Promise<void> {
    const closeButton = this.page.locator('ion-modal ion-button:has-text("Cerrar"), ion-modal button[aria-label="close"]');
    if (await this.isElementVisible(closeButton, 2000)) {
      await closeButton.click();
    } else {
      // Fallback: ESC key
      await this.page.keyboard.press('Escape');
    }
    await this.page.locator('ion-modal').waitFor({ state: 'hidden' });
  }

  /**
   * Manejo de toasts/notificaciones
   */
  async getToastMessage(): Promise<string> {
    const toastSelectors = [
      'ion-toast',
      '.toast',
      '[role="alert"]',
      '.notification'
    ];

    for (const selector of toastSelectors) {
      const toast = this.page.locator(selector);
      if (await this.isElementVisible(toast, 2000)) {
        return await toast.textContent() || '';
      }
    }

    return '';
  }

  /**
   * Espera a que aparezca un toast con mensaje específico
   */
  async waitForToast(messagePattern: RegExp, timeout: number = 5000): Promise<void> {
    await this.page.locator(`ion-toast:has-text("${messagePattern.source}")`).waitFor({
      state: 'visible',
      timeout
    });
  }
}