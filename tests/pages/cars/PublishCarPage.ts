import { Page, Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * Publish Car Page Object
 *
 * Handles car publication form and interactions
 * Used by: Test P0 #2 (Owner can publish new car)
 */
export class PublishCarPage extends BasePage {
  // Form locators
  readonly publishForm: Locator;
  readonly brandSelect: Locator;
  readonly modelInput: Locator;
  readonly yearInput: Locator;
  readonly priceInput: Locator;
  readonly descriptionTextarea: Locator;
  readonly categorySelect: Locator;
  readonly transmissionSelect: Locator;
  readonly fuelTypeSelect: Locator;
  readonly seatsInput: Locator;

  // Location fields
  readonly citySelect: Locator;
  readonly addressInput: Locator;

  // Photo upload
  readonly photoUploadInput: Locator;
  readonly photoPreviewList: Locator;

  // Buttons
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  // Validation
  readonly errorMessages: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Form
    this.publishForm = page.getByTestId('publish-form')
      .or(page.locator('form[name="publishCar"]'))
      .or(page.locator('#publish-car-form'));

    // Basic info
    this.brandSelect = page.getByTestId('brand-select')
      .or(page.locator('select[name="brand"]'))
      .or(page.locator('#brand'));

    this.modelInput = page.getByTestId('model-input')
      .or(page.locator('input[name="model"]'))
      .or(page.locator('#model'));

    this.yearInput = page.getByTestId('year-input')
      .or(page.locator('input[name="year"]'))
      .or(page.locator('#year'));

    this.priceInput = page.getByTestId('price-input')
      .or(page.locator('input[name="price_per_day"]'))
      .or(page.locator('#price'));

    this.descriptionTextarea = page.getByTestId('description-textarea')
      .or(page.locator('textarea[name="description"]'))
      .or(page.locator('#description'));

    // Car details
    this.categorySelect = page.getByTestId('category-select')
      .or(page.locator('select[name="category"]'))
      .or(page.locator('#category'));

    this.transmissionSelect = page.getByTestId('transmission-select')
      .or(page.locator('select[name="transmission"]'))
      .or(page.locator('#transmission'));

    this.fuelTypeSelect = page.getByTestId('fuel-type-select')
      .or(page.locator('select[name="fuel_type"]'))
      .or(page.locator('#fuelType'));

    this.seatsInput = page.getByTestId('seats-input')
      .or(page.locator('input[name="seats"]'))
      .or(page.locator('#seats'));

    // Location
    this.citySelect = page.getByTestId('city-select')
      .or(page.locator('select[name="city"]'))
      .or(page.locator('#city'));

    this.addressInput = page.getByTestId('address-input')
      .or(page.locator('input[name="address"]'))
      .or(page.locator('#address'));

    // Photos
    this.photoUploadInput = page.getByTestId('photo-upload')
      .or(page.locator('input[type="file"]'))
      .or(page.locator('#photos'));

    this.photoPreviewList = page.getByTestId('photo-preview-list')
      .or(page.locator('.photo-preview-container'));

    // Actions
    this.submitButton = page.getByRole('button', { name: /publicar|submit|guardar/i })
      .or(page.getByTestId('submit-button'));

    this.cancelButton = page.getByRole('button', { name: /cancelar|cancel/i })
      .or(page.getByTestId('cancel-button'));

    // Feedback
    this.errorMessages = page.locator('.error-message, .text-red-500, [role="alert"]');
    this.successMessage = page.getByTestId('success-message')
      .or(page.locator('.success-message'));
  }

  /**
   * Navigate to publish car page
   */
  async goto(): Promise<void> {
    await super.goto('/cars/publish');
    await this.waitForVisible(this.publishForm);
  }

  /**
   * Fill basic car information
   */
  async fillBasicInfo(data: {
    brand: string;
    model: string;
    year: number;
    pricePerDay: number;
    description: string;
  }): Promise<void> {
    await this.brandSelect.selectOption(data.brand);
    await this.fillInput(this.modelInput, data.model);
    await this.fillInput(this.yearInput, data.year.toString());
    await this.fillInput(this.priceInput, data.pricePerDay.toString());
    await this.fillInput(this.descriptionTextarea, data.description);
  }

  /**
   * Fill car details
   */
  async fillCarDetails(data: {
    category: string;
    transmission: string;
    fuelType: string;
    seats: number;
  }): Promise<void> {
    await this.categorySelect.selectOption(data.category);
    await this.transmissionSelect.selectOption(data.transmission);
    await this.fuelTypeSelect.selectOption(data.fuelType);
    await this.fillInput(this.seatsInput, data.seats.toString());
  }

  /**
   * Fill location
   */
  async fillLocation(data: {
    city: string;
    address: string;
  }): Promise<void> {
    await this.citySelect.selectOption(data.city);
    await this.fillInput(this.addressInput, data.address);
  }

  /**
   * Upload photos
   */
  async uploadPhotos(photoPaths: string[]): Promise<void> {
    await this.uploadFile(this.photoUploadInput, photoPaths);

    // Wait for previews to appear
    const expectedCount = photoPaths.length;
    const previews = this.photoPreviewList.locator('img');
    await this.page.waitForFunction(
      (count) => document.querySelectorAll('.photo-preview-container img').length === count,
      expectedCount
    );
  }

  /**
   * Submit form
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Fill complete form and submit
   */
  async publishCar(data: {
    brand: string;
    model: string;
    year: number;
    pricePerDay: number;
    description: string;
    category: string;
    transmission: string;
    fuelType: string;
    seats: number;
    city: string;
    address: string;
    photos?: string[];
  }): Promise<void> {
    await this.fillBasicInfo({
      brand: data.brand,
      model: data.model,
      year: data.year,
      pricePerDay: data.pricePerDay,
      description: data.description,
    });

    await this.fillCarDetails({
      category: data.category,
      transmission: data.transmission,
      fuelType: data.fuelType,
      seats: data.seats,
    });

    await this.fillLocation({
      city: data.city,
      address: data.address,
    });

    if (data.photos && data.photos.length > 0) {
      await this.uploadPhotos(data.photos);
    }

    await this.submit();
  }

  /**
   * Assert form validation errors are visible
   */
  async assertValidationErrors(): Promise<void> {
    await this.waitForVisible(this.errorMessages.first());
  }

  /**
   * Assert success message is visible
   */
  async assertSuccess(): Promise<void> {
    await this.waitForVisible(this.successMessage);
  }

  /**
   * Assert redirected to my cars page
   */
  async assertRedirectedToMyCars(): Promise<void> {
    await this.assertUrlContains('/cars/my-cars');
  }
}
