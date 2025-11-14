/**
 * StockPhotoSelector - Componente para el modal de selección de fotos de stock
 *
 * Maneja la interacción completa con el modal de fotos:
 * - Búsqueda de fotos
 * - Selección múltiple
 * - Confirmación
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '../base/BaseComponent';

export class StockPhotoSelector extends BaseComponent {
  // Selectores del modal
  private readonly brandInput = this.locator('input[name="brand"], input[placeholder*="marca"]');
  private readonly modelInput = this.locator('input[name="model"], input[placeholder*="modelo"]');
  private readonly searchButton = this.locator('button:has-text("🔍"), button:has-text("Buscar")');
  private readonly photoGrid = this.locator('.photo-grid, .images-grid');
  private readonly photoItems = this.locator('img, .photo-item, .image-container img');
  private readonly selectedPhotos = this.locator('.selected, .photo-item.selected');
  private readonly applyButton = this.locator('button:has-text("Aplicar"), button:has-text("Confirmar"), button:has-text("Usar")');
  private readonly cancelButton = this.locator('button:has-text("Cancelar"), button:has-text("Cerrar")');
  private readonly loadingIndicator = this.locator('.loading, ion-spinner, .spinner');
  private readonly photoCounter = this.locator('.photo-counter, .selected-count');

  constructor(page: Page) {
    super(page, 'app-stock-photos-selector, ion-modal[is-open="true"]');
  }

  /**
   * Espera a que el modal esté completamente abierto
   */
  async waitForOpen(): Promise<void> {
    await this.waitForVisible(10000);
    await this.waitForAnimation();
  }

  /**
   * Llena los campos de búsqueda si es necesario
   */
  async fillSearchCriteria(brand?: string, model?: string): Promise<void> {
    if (brand && await this.isElementVisible('input[name="brand"]', 1000)) {
      await this.fill('input[name="brand"]', brand);
    }
    if (model && await this.isElementVisible('input[name="model"]', 1000)) {
      await this.fill('input[name="model"]', model);
    }
  }

  /**
   * Ejecuta la búsqueda de fotos
   */
  async search(brand?: string, model?: string): Promise<void> {
    // Llenar campos si se proporcionan
    await this.fillSearchCriteria(brand, model);

    // Click en buscar
    await this.searchButton.click();

    // Esperar a que termine de cargar
    await this.waitForPhotosToLoad();
  }

  /**
   * Espera a que las fotos se carguen
   */
  private async waitForPhotosToLoad(): Promise<void> {
    // Esperar a que el loading desaparezca si existe
    if (await this.isElementVisible('.loading, ion-spinner', 1000)) {
      await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // Esperar a que aparezcan las fotos
    await this.photoItems.first().waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Selecciona un número específico de fotos
   */
  async selectPhotos(count: number): Promise<void> {
    // Esperar a que las fotos estén disponibles
    await this.photoItems.first().waitFor({ state: 'visible' });

    const totalPhotos = await this.photoItems.count();
    const photosToSelect = Math.min(count, totalPhotos);

    console.log(`📸 Seleccionando ${photosToSelect} de ${totalPhotos} fotos disponibles`);

    for (let i = 0; i < photosToSelect; i++) {
      const photo = this.photoItems.nth(i);

      // Click en la foto
      await photo.click();
      await this.page.waitForTimeout(200); // Pequeña espera para la animación de selección

      // Verificar si se seleccionó correctamente
      const isSelected = await this.isPhotoSelected(i);
      if (!isSelected) {
        console.log(`⚠️ Foto ${i + 1} no se seleccionó, intentando de nuevo...`);
        await photo.click();
        await this.page.waitForTimeout(200);
      }
    }

    // Verificar el contador de fotos seleccionadas
    const selectedCount = await this.getSelectedCount();
    console.log(`✅ ${selectedCount} fotos seleccionadas`);
  }

  /**
   * Verifica si una foto específica está seleccionada
   */
  private async isPhotoSelected(index: number): Promise<boolean> {
    const photo = this.photoItems.nth(index);
    const container = photo.locator('..');

    // Verificar por clase 'selected' o algún indicador visual
    const hasSelectedClass = await container.evaluate(el => el.classList.contains('selected'));
    const hasCheckmark = await container.locator('.checkmark, .selected-indicator').isVisible().catch(() => false);

    return hasSelectedClass || hasCheckmark;
  }

  /**
   * Obtiene el número de fotos seleccionadas
   */
  async getSelectedCount(): Promise<number> {
    // Intentar obtener del contador
    if (await this.isElementVisible('.photo-counter, .selected-count', 1000)) {
      const counterText = await this.photoCounter.textContent();
      const match = counterText?.match(/(\d+)/);
      if (match) return parseInt(match[1]);
    }

    // Si no hay contador, contar elementos seleccionados
    return await this.selectedPhotos.count();
  }

  /**
   * Confirma la selección de fotos
   */
  async confirm(): Promise<void> {
    // Verificar que hay fotos seleccionadas
    const selectedCount = await this.getSelectedCount();
    if (selectedCount === 0) {
      throw new Error('No hay fotos seleccionadas para confirmar');
    }

    // Click en aplicar/confirmar
    await this.applyButton.click();

    // Esperar a que el modal se cierre
    await this.waitForHidden(5000);
  }

  /**
   * Cancela la selección
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.waitForHidden(5000);
  }

  /**
   * Flujo completo: buscar y seleccionar fotos
   */
  async selectStockPhotos(count: number = 3, brand?: string, model?: string): Promise<void> {
    await this.waitForOpen();
    await this.search(brand, model);
    await this.selectPhotos(count);
    await this.confirm();
  }

  /**
   * Verifica si el botón de búsqueda está habilitado
   */
  async isSearchButtonEnabled(): Promise<boolean> {
    const isDisabled = await this.searchButton.getAttribute('disabled');
    return isDisabled === null || isDisabled === 'false';
  }

  /**
   * Verifica si el botón de aplicar está habilitado
   */
  async isApplyButtonEnabled(): Promise<boolean> {
    const isDisabled = await this.applyButton.getAttribute('disabled');
    return isDisabled === null || isDisabled === 'false';
  }

  /**
   * Obtiene el mensaje de error si existe
   */
  async getErrorMessage(): Promise<string> {
    const errorSelectors = [
      '.error-message',
      '.no-results',
      'ion-note.error'
    ];

    for (const selector of errorSelectors) {
      const error = this.locator(selector);
      if (await this.isElementVisible(selector, 1000)) {
        return await error.textContent() || '';
      }
    }

    return '';
  }

  /**
   * Verifica si hay fotos disponibles
   */
  async hasPhotosAvailable(): Promise<boolean> {
    return (await this.photoItems.count()) > 0;
  }

  /**
   * Limpia la selección actual
   */
  async clearSelection(): Promise<void> {
    const selected = await this.selectedPhotos.all();
    for (const photo of selected) {
      await photo.click();
      await this.page.waitForTimeout(100);
    }
  }
}