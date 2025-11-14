/**
 * BaseComponent - Clase base para componentes reutilizables
 *
 * Para elementos que aparecen en múltiples páginas como:
 * - Modales
 * - Formularios
 * - Date pickers
 * - Selectores de fotos
 */

import { Page, Locator } from '@playwright/test';

export abstract class BaseComponent {
  protected readonly page: Page;
  protected readonly rootSelector: string;

  constructor(page: Page, rootSelector: string = '') {
    this.page = page;
    this.rootSelector = rootSelector;
  }

  /**
   * Obtiene el elemento raíz del componente
   */
  protected get root(): Locator {
    return this.rootSelector
      ? this.page.locator(this.rootSelector)
      : this.page.locator('body');
  }

  /**
   * Busca un elemento dentro del componente
   */
  protected locator(selector: string): Locator {
    return this.root.locator(selector);
  }

  /**
   * Verifica si el componente está visible
   */
  async isVisible(timeout: number = 5000): Promise<boolean> {
    try {
      await this.root.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Espera a que el componente esté visible
   */
  async waitForVisible(timeout: number = 10000): Promise<void> {
    await this.root.waitFor({ state: 'visible', timeout });
  }

  /**
   * Espera a que el componente esté oculto
   */
  async waitForHidden(timeout: number = 5000): Promise<void> {
    await this.root.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Click en un elemento dentro del componente
   */
  async click(selector: string): Promise<void> {
    await this.locator(selector).click();
  }

  /**
   * Fill en un elemento dentro del componente
   */
  async fill(selector: string, value: string): Promise<void> {
    await this.locator(selector).fill(value);
  }

  /**
   * Obtiene el texto de un elemento dentro del componente
   */
  async getText(selector: string): Promise<string> {
    return await this.locator(selector).textContent() || '';
  }

  /**
   * Verifica si un elemento dentro del componente está visible
   */
  async isElementVisible(selector: string, timeout: number = 5000): Promise<boolean> {
    try {
      await this.locator(selector).waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Espera para animaciones
   */
  async waitForAnimation(duration: number = 300): Promise<void> {
    await this.page.waitForTimeout(duration);
  }
}