import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * Publish Car Page Object (v2 UI)
 *
 * Usa los selectores reales de la página Angular actual.
 * Requiere subir mínimo 3 fotos y marca/modelo vía FIPE autocomplete.
 */
export class PublishCarPage extends BasePage {
  readonly publishForm: Locator;

  // FIPE autocompletes
  readonly brandInput: Locator;
  readonly modelInput: Locator;
  readonly brandOptions: Locator;
  readonly modelOptions: Locator;

  // Basic fields
  readonly yearSelect: Locator;
  readonly mileageInput: Locator;
  readonly colorInput: Locator;
  readonly transmissionSelect: Locator;
  readonly fuelSelect: Locator;

  // Pricing
  readonly priceModeCustom: Locator;
  readonly pricePerDayInput: Locator;

  // Location
  readonly streetInput: Locator;
  readonly streetNumberInput: Locator;
  readonly cityInput: Locator;
  readonly stateInput: Locator;
  readonly countrySelect: Locator;

  // Photos
  readonly photoInput: Locator;
  readonly photoPreviews: Locator;

  // Actions
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);

    this.publishForm = page.getByTestId('publish-form').first();

    // Autocomplete components (brand/model) - first = brand, second = model
    this.brandInput = page.locator('app-fipe-autocomplete').nth(0).locator('input');
    this.modelInput = page.locator('app-fipe-autocomplete').nth(1).locator('input');
    this.brandOptions = page.locator('app-fipe-autocomplete').nth(0).locator('button');
    this.modelOptions = page.locator('app-fipe-autocomplete').nth(1).locator('button');

    this.yearSelect = page.locator('select[formcontrolname="year"]');
    this.mileageInput = page.locator('input[formcontrolname="mileage"]');
    this.colorInput = page.locator('input[formcontrolname="color"]');
    this.transmissionSelect = page.locator('select[formcontrolname="transmission"]');
    this.fuelSelect = page.locator('select[formcontrolname="fuel"]');

    this.priceModeCustom = page.getByRole('button', { name: /precio personalizado/i }).first();
    this.pricePerDayInput = page.locator('input[formcontrolname="price_per_day"]');

    this.streetInput = page.locator('input[formcontrolname="location_street"]');
    this.streetNumberInput = page.locator('input[formcontrolname="location_street_number"]');
    this.cityInput = page.locator('input[formcontrolname="location_city"]');
    this.stateInput = page.locator('input[formcontrolname="location_state"]');
    this.countrySelect = page.locator('select[formcontrolname="location_country"]');

    this.photoInput = page.locator('input[type="file"]').first();
    this.photoPreviews = page.locator('img[alt^="Foto"]');

    this.submitButton = page.getByRole('button', { name: /publicar|guardar|continuar/i }).first();
  }

  async goto(): Promise<void> {
    await super.goto('/cars/publish');
    await this.waitForVisible(this.publishForm);
  }

  async selectBrand(name: string): Promise<void> {
    await this.brandInput.fill(name.slice(0, 3));
    await this.page.waitForTimeout(500);
    const option = this.brandOptions.filter({ hasText: new RegExp(name, 'i') }).first();
    await option.click({ trial: true }).catch(() => {});
    await option.click();
  }

  async selectModel(name: string): Promise<void> {
    await this.modelInput.fill(name.slice(0, 3));
    await this.page.waitForTimeout(500);
    const option = this.modelOptions.filter({ hasText: new RegExp(name, 'i') }).first();
    await option.click({ trial: true }).catch(() => {});
    await option.click();
  }

  async fillYear(year: number): Promise<void> {
    await this.yearSelect.selectOption(year.toString());
  }

  async fillVehicleDetails(opts: {
    mileage?: number;
    color?: string;
    transmission?: 'Manual' | 'Automática';
    fuel?: 'nafta' | 'gasoil' | 'electrico' | 'hibrido';
  }): Promise<void> {
    if (opts.mileage !== undefined) {
      await this.mileageInput.fill(String(opts.mileage));
    }
    if (opts.color) {
      await this.colorInput.fill(opts.color);
    }
    if (opts.transmission) {
      await this.transmissionSelect.selectOption({ label: opts.transmission });
    }
    if (opts.fuel) {
      await this.fuelSelect.selectOption({ value: opts.fuel });
    }
  }

  async configurePricing(pricePerDay: number): Promise<void> {
    await this.priceModeCustom.click();
    await this.pricePerDayInput.fill(pricePerDay.toString());
  }

  async fillLocation(data: {
    street: string;
    number: string;
    city: string;
    state: string;
    country?: string;
  }): Promise<void> {
    await this.streetInput.fill(data.street);
    await this.streetNumberInput.fill(data.number);
    await this.cityInput.fill(data.city);
    await this.stateInput.fill(data.state);
    if (data.country) {
      await this.countrySelect.selectOption(data.country);
    }
  }

  async uploadPhotos(paths: string[]): Promise<void> {
    await this.photoInput.setInputFiles(paths);
    await expect(this.photoPreviews).toHaveCount(paths.length, { timeout: 10000 });
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async assertRedirectedToMyCars(): Promise<void> {
    await expect(this.page).toHaveURL(/\/cars\/my-cars/i, { timeout: 15000 });
  }
}
