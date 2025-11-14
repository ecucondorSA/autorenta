/**
 * PublishCarPage - Page Object para publicar autos
 *
 * Maneja todo el flujo de publicación de autos:
 * - Formulario básico
 * - Selección de fotos (stock o upload)
 * - Validación y envío
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export interface CarFormData {
  brand: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  description: string;
  pricePerDay: number;
  city?: string;
  address?: string;
  features?: string[];
}

export class PublishCarPage extends BasePage {
  // Selectores del formulario
  private readonly brandSelect = this.page.locator('select[name="brand_id"], ion-select[name="brand_id"]');
  private readonly modelSelect = this.page.locator('select[name="model_id"], ion-select[name="model_id"]');
  private readonly yearInput = this.page.locator('input[name="year"]');
  private readonly colorInput = this.page.locator('input[name="color"]');
  private readonly licensePlateInput = this.page.locator('input[name="license_plate"]');
  private readonly descriptionTextarea = this.page.locator('textarea[name="description"]');
  private readonly pricePerDayInput = this.page.locator('input[name="price_per_day"]');
  private readonly cityInput = this.page.locator('input[name="city"]');
  private readonly addressInput = this.page.locator('input[name="address"]');

  // Selectores de fotos
  private readonly stockPhotosButton = this.page.locator('button:has-text("Buscar Fotos de Stock"), button:has-text("📸")');
  private readonly uploadPhotosButton = this.page.locator('button:has-text("Subir Fotos"), input[type="file"]');
  private readonly photoCounter = this.page.locator('text=/\\d+\\/10/');

  // Selectores de acciones
  private readonly submitButton = this.page.locator('button[type="submit"], ion-button[type="submit"]:has-text("Publicar")');
  private readonly saveButton = this.page.locator('button:has-text("Guardar Borrador")');

  // Selectores de validación
  private readonly successMessage = this.page.locator('ion-toast:has-text("éxito"), .toast.success, [role="alert"]:has-text("publicado")');
  private readonly errorMessages = this.page.locator('.error-message, ion-note.error');

  constructor(page: Page) {
    super(page, '/cars/publish');
  }

  /**
   * Navega a la página de publicar auto con verificación
   */
  async goto(): Promise<void> {
    await super.goto();
    await this.waitForFormReady();
  }

  /**
   * Espera a que el formulario esté listo
   */
  private async waitForFormReady(): Promise<void> {
    await this.waitForElement(this.brandSelect, 10000);
  }

  /**
   * Selecciona una marca de auto
   */
  async selectBrand(brand: string): Promise<void> {
    // Primero intentar con select estándar
    const standardSelect = this.page.locator('select[name="brand_id"]');
    if (await this.isElementVisible(standardSelect, 1000)) {
      await standardSelect.selectOption({ label: brand });
      return;
    }

    // Si no, usar ion-select
    const ionSelect = this.page.locator('ion-select[name="brand_id"]');
    await ionSelect.click();
    await this.waitForIonicAnimation();

    // Buscar la opción en el popover
    const option = this.page.locator(`ion-popover ion-item:has-text("${brand}")`).first();
    await option.click();
    await this.page.locator('ion-popover').waitFor({ state: 'hidden' });
  }

  /**
   * Selecciona un modelo de auto
   */
  async selectModel(model: string): Promise<void> {
    // Esperar a que se carguen los modelos después de seleccionar la marca
    await this.page.waitForTimeout(500);

    // Primero intentar con select estándar
    const standardSelect = this.page.locator('select[name="model_id"]');
    if (await this.isElementVisible(standardSelect, 1000)) {
      await standardSelect.selectOption({ label: model });
      return;
    }

    // Si no, usar ion-select
    const ionSelect = this.page.locator('ion-select[name="model_id"]');
    await ionSelect.click();
    await this.waitForIonicAnimation();

    // Buscar la opción en el popover
    const option = this.page.locator(`ion-popover ion-item:has-text("${model}")`).first();
    await option.click();
    await this.page.locator('ion-popover').waitFor({ state: 'hidden' });
  }

  /**
   * Llena los campos básicos del formulario
   */
  async fillBasicInfo(carData: CarFormData): Promise<void> {
    // Marca y modelo
    await this.selectBrand(carData.brand);
    await this.selectModel(carData.model);

    // Información básica
    await this.fillFormField('year', carData.year.toString());
    await this.fillFormField('color', carData.color);
    await this.fillFormField('license_plate', carData.licensePlate);
    await this.fillFormField('description', carData.description);
    await this.fillFormField('price_per_day', carData.pricePerDay.toString());

    // Ubicación (opcional)
    if (carData.city) {
      await this.fillFormField('location_city', carData.city);
    }
    if (carData.address) {
      // El address puede ser location_street + location_street_number
      await this.fillFormField('location_street', carData.address);
    }
  }

  /**
   * Llena solo los campos obligatorios mínimos
   */
  async fillMinimalInfo(brand: string, model: string, year: number, price: number): Promise<void> {
    await this.selectBrand(brand);
    await this.selectModel(model);
    await this.fillFormField('year', year.toString());
    await this.fillFormField('price_per_day', price.toString());
  }

  /**
   * Abre el modal de fotos de stock
   */
  async openStockPhotosModal(): Promise<void> {
    await this.stockPhotosButton.click();
    await this.waitForModal(5000);
  }

  /**
   * Verifica cuántas fotos están cargadas
   */
  async getPhotosCount(): Promise<number> {
    const counterText = await this.photoCounter.textContent();
    if (!counterText) return 0;

    const match = counterText.match(/(\d+)\/10/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Publica el auto (submit del formulario)
   */
  async publish(): Promise<void> {
    await this.submitButton.scrollIntoViewIfNeeded();
    await this.submitButton.click();

    // Esperar a que se complete la publicación
    await Promise.race([
      this.page.waitForURL(/\/cars\/(my|[a-z0-9-]+)/, { timeout: 15000 }),
      this.successMessage.waitFor({ state: 'visible', timeout: 10000 }),
      this.errorMessages.first().waitFor({ state: 'visible', timeout: 5000 })
    ]).catch(() => {
      // Si ninguna condición se cumple, continuar
    });
  }

  /**
   * Guarda como borrador
   */
  async saveDraft(): Promise<void> {
    if (await this.isElementVisible(this.saveButton)) {
      await this.saveButton.click();
    }
  }

  /**
   * Verifica si la publicación fue exitosa
   */
  async isPublishSuccessful(): Promise<boolean> {
    // Verificar por URL o mensaje de éxito
    const currentUrl = this.page.url();
    const isRedirected = currentUrl.includes('/cars/my') || currentUrl.includes('/cars/') && !currentUrl.includes('/publish');
    const hasSuccessMessage = await this.isElementVisible(this.successMessage, 3000);

    return isRedirected || hasSuccessMessage;
  }

  /**
   * Obtiene mensajes de error del formulario
   */
  async getFormErrors(): Promise<string[]> {
    const errors = await this.getValidationErrors();
    return errors;
  }

  /**
   * Verifica si el formulario está válido (sin errores visibles)
   */
  async isFormValid(): Promise<boolean> {
    const errors = await this.getFormErrors();
    return errors.length === 0;
  }

  /**
   * Flujo completo: llenar formulario y publicar
   */
  async publishCar(carData: CarFormData, options?: { useStockPhotos?: boolean }): Promise<void> {
    await this.goto();
    await this.fillBasicInfo(carData);

    // Si se requieren fotos de stock, delegar al componente StockPhotoSelector
    if (options?.useStockPhotos) {
      await this.openStockPhotosModal();
      // El componente StockPhotoSelector manejará la selección
    }

    await this.publish();
  }

  /**
   * Verifica si el botón de publicar está habilitado
   */
  async isPublishButtonEnabled(): Promise<boolean> {
    const isDisabled = await this.submitButton.getAttribute('disabled');
    return isDisabled === null || isDisabled === 'false';
  }

  /**
   * Espera a que el formulario esté válido para enviar
   */
  async waitForFormValid(timeout: number = 5000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        return submitButton && !submitButton.disabled;
      },
      { timeout }
    );
  }

  /**
   * Limpia todo el formulario
   */
  async clearForm(): Promise<void> {
    await this.yearInput.clear();
    await this.colorInput.clear();
    await this.licensePlateInput.clear();
    await this.descriptionTextarea.clear();
    await this.pricePerDayInput.clear();
    await this.cityInput.clear();
    await this.addressInput.clear();
  }
}