/**
 * Payment Page Object
 *
 * Encapsulates interactions with the booking payment/checkout page.
 * Handles MercadoPago Payment Brick (iframe-based SDK).
 */

import type { Page, BrowserContext, Locator, Frame } from 'patchright';
import { BasePage } from './base.page';
import { NetworkLogger } from '../utils/network-logger';
import { waitForElement, waitForApiResponse, sleep } from '../utils/waits';

export interface PaymentPageParams {
  carId: string;
  startDate: string; // ISO format
  endDate: string; // ISO format
}

export interface TestCardData {
  number: string;
  expiry: string; // MM/YY format
  cvv: string;
  holder: string;
  docType: string;
  docNumber: string;
  email: string;
}

export class PaymentPage extends BasePage {
  // Page-specific selectors
  private get payment() {
    return this.selectors.payment;
  }
  private get mpBrick() {
    return this.selectors.mpBrick;
  }

  constructor(page: Page, context: BrowserContext, networkLogger: NetworkLogger) {
    super(page, context, networkLogger);
  }

  // ==================== NAVIGATION ====================

  /**
   * Navigate to payment page with booking parameters
   */
  async goto(params: PaymentPageParams): Promise<void> {
    const queryString = new URLSearchParams({
      carId: params.carId,
      startDate: params.startDate,
      endDate: params.endDate,
    }).toString();
    await this.navigate(`/bookings/detail-payment?${queryString}`);
  }

  /**
   * Check if on payment page
   */
  isOnPaymentPage(): boolean {
    return this.urlContains('/bookings/detail-payment');
  }

  // ==================== PAGE STATE ====================

  /**
   * Wait for page to fully load (car info + FX rates + MP brick)
   */
  async waitForPageLoaded(timeout = 30000): Promise<void> {
    // Wait for page title
    await this.page.waitForSelector(this.payment.pageTitle, { timeout });

    // Wait for loading to finish
    try {
      await this.waitForHidden(this.payment.loadingSpinner, 15000);
    } catch {
      // Loading might already be done
    }

    // Wait for car summary to appear (indicates data loaded)
    await this.page.waitForSelector(this.payment.carBrand, { timeout: 10000 });
  }

  /**
   * Wait for MercadoPago brick to be ready
   */
  async waitForMPBrickReady(timeout = 30000): Promise<void> {
    // Wait for "Cargando formulario" to disappear
    try {
      await this.waitForHidden(this.payment.mpLoadingText, timeout);
    } catch {
      // May already be loaded
    }

    // Wait for brick container to have content
    await this.page.waitForFunction(
      (selector) => {
        const container = document.querySelector(selector);
        return container && container.children.length > 0;
      },
      this.payment.mpBrickContainer,
      { timeout }
    );

    // Give the iframe time to render
    await sleep(1000);
  }

  /**
   * Check if page is in loading state
   */
  async isLoading(): Promise<boolean> {
    return this.isVisible(this.payment.loadingSpinner);
  }

  /**
   * Check if there's an error displayed
   */
  async hasError(): Promise<boolean> {
    // Check for various error indicators
    const errorIndicators = [
      ':has-text("Hubo un problema")',
      ':has-text("Faltan parámetros")',
      ':has-text("Error")',
      'button:has-text("Intentar nuevamente")',
    ];

    for (const indicator of errorIndicators) {
      try {
        const count = await this.page.locator(indicator).count();
        if (count > 0) {
          return true;
        }
      } catch {
        // Continue checking
      }
    }

    return false;
  }

  /**
   * Get error message if displayed
   */
  async getErrorMessage(): Promise<string> {
    // Try to find error message text
    const messageSelectors = [
      'p:has-text("Faltan")',
      ':has-text("Hubo un problema") ~ p',
      'div:has-text("problema") p',
    ];

    for (const selector of messageSelectors) {
      try {
        const locator = this.page.locator(selector);
        if ((await locator.count()) > 0) {
          return (await locator.first().textContent()) || '';
        }
      } catch {
        // Continue trying
      }
    }

    return '';
  }

  // ==================== CAR & BOOKING INFO ====================

  /**
   * Get car brand from summary
   */
  async getCarBrand(): Promise<string> {
    return this.getText(this.payment.carBrand);
  }

  /**
   * Get car model from summary
   */
  async getCarModel(): Promise<string> {
    return this.getText(this.payment.carModel);
  }

  /**
   * Get total in USD
   */
  async getTotalUsd(): Promise<string> {
    return this.getText(this.payment.totalUsd);
  }

  /**
   * Get total in ARS (approximate)
   */
  async getTotalArs(): Promise<string> {
    return this.getText(this.payment.totalArs);
  }

  // ==================== PAYMENT MODE ====================

  /**
   * Select direct payment mode
   */
  async selectDirectPayment(): Promise<void> {
    await this.click(this.payment.directPaymentBtn);
    await sleep(300);
  }

  /**
   * Select preauthorization payment mode
   */
  async selectPreauthorization(): Promise<void> {
    await this.click(this.payment.preauthPaymentBtn);
    await sleep(300);
  }

  /**
   * Check if direct payment is selected
   */
  async isDirectPaymentSelected(): Promise<boolean> {
    const btn = this.page.locator(this.payment.directPaymentBtn);
    const classes = await btn.getAttribute('class');
    return classes?.includes('shadow') || false;
  }

  // ==================== MERCADOPAGO FORM INTERACTION ====================
  // Note: MercadoPago CardPayment Brick uses a HYBRID approach:
  // - SECURE IFRAMES for: card number, expiration, CVV (PCI-DSS compliance)
  // - NATIVE INPUTS for: cardholder name, document number, email

  /**
   * Check if MP card form is loaded
   * The CardPayment Brick has both iframes and native inputs
   */
  async isMPFormLoaded(): Promise<boolean> {
    // Check for native inputs (holder name, document, email)
    const nativeInputs = await this.page.locator('#paymentBrick_container input').count();
    // Check for secure iframes (card data)
    const iframes = await this.page.locator('#paymentBrick_container iframe').count();

    console.log(`MP form: ${nativeInputs} native inputs, ${iframes} secure iframes`);

    // Form is loaded if we have either native inputs or iframes
    return nativeInputs > 0 || iframes > 0;
  }

  /**
   * Get secure iframe for card number input
   */
  async getCardNumberFrame(): Promise<Frame | null> {
    // MercadoPago uses iframes for secure card data entry
    const iframeSelectors = [
      '#paymentBrick_container iframe[title*="card"]',
      '#paymentBrick_container iframe[title*="número"]',
      '#paymentBrick_container iframe:first-of-type',
      'iframe[src*="mercadopago"]',
    ];

    for (const selector of iframeSelectors) {
      const frameLocator = this.page.frameLocator(selector);
      try {
        // Check if frame has content
        const frame = this.page.frames().find(f => {
          const url = f.url();
          return url.includes('mercadopago') || url.includes('mlstatic');
        });
        if (frame) {
          console.log(`Found MP secure frame: ${frame.url()}`);
          return frame;
        }
      } catch {
        // Continue trying
      }
    }

    return null;
  }

  /**
   * Wait for MP card form to be ready
   */
  async waitForMPFormReady(timeout = 30000): Promise<void> {
    // Wait for the brick container to have content
    await this.page.waitForFunction(
      () => {
        const container = document.querySelector('#paymentBrick_container');
        if (!container) return false;
        // Check for any input element in the container
        return container.querySelectorAll('input').length > 0;
      },
      { timeout }
    );
    await sleep(1000);
  }

  /**
   * Fill card number (in secure iframe)
   */
  async fillCardNumber(cardNumber: string): Promise<void> {
    // Wait a bit for iframes to fully load their content
    await sleep(2000);

    // Card number is in a secure iframe - find all iframes in the brick
    const iframes = this.page.locator('#paymentBrick_container iframe');
    const count = await iframes.count();
    console.log(`Found ${count} iframes in payment brick`);

    // Try to find and fill card number in each iframe
    for (let i = 0; i < count; i++) {
      try {
        const iframe = iframes.nth(i);
        const title = await iframe.getAttribute('title');
        const src = await iframe.getAttribute('src');
        console.log(`Iframe ${i} title: ${title}, src: ${src?.substring(0, 50)}...`);

        // Use frameLocator to interact with iframe content
        const frameLocator = this.page.frameLocator(`#paymentBrick_container iframe >> nth=${i}`);
        const input = frameLocator.locator('input').first();

        // Check if this iframe has an input
        try {
          await input.waitFor({ state: 'visible', timeout: 5000 });
          await input.click();
          // Type character by character for better compatibility
          await input.fill('');
          for (const char of cardNumber) {
            await input.press(char);
            await sleep(50);
          }
          console.log(`Filled card number in iframe ${i}`);
          return;
        } catch {
          // Not the right iframe, continue
        }
      } catch (e) {
        console.log(`Error with iframe ${i}:`, e);
      }
    }

    throw new Error('Card number input not found in any iframe');
  }

  /**
   * Fill expiration date (in secure iframe)
   */
  async fillExpiration(expiry: string): Promise<void> {
    // Expiration is in a secure iframe - typically the second one
    const iframes = this.page.locator('#paymentBrick_container iframe');
    const count = await iframes.count();

    // Try iframes starting from index 1 (usually expiration is second)
    for (let i = 0; i < count; i++) {
      try {
        const title = await iframes.nth(i).getAttribute('title');
        console.log(`Checking iframe ${i} for expiration: ${title}`);

        const frameLocator = this.page.frameLocator(`#paymentBrick_container iframe >> nth=${i}`);
        const input = frameLocator.locator('input').first();

        try {
          await input.waitFor({ state: 'visible', timeout: 1500 });
          // Type expiry
          await input.click();
          await input.fill('');
          for (const char of expiry) {
            await input.press(char);
            await sleep(30);
          }
          console.log(`Filled expiration in iframe ${i}`);
          return;
        } catch {
          // Not the right iframe
        }
      } catch (e) {
        console.log(`Error with iframe ${i} for expiration:`, e);
      }
    }

    throw new Error('Expiration input not found in any iframe');
  }

  /**
   * Fill CVV/Security code (in secure iframe)
   */
  async fillCvv(cvv: string): Promise<void> {
    // CVV is in a secure iframe - typically the third one
    const iframes = this.page.locator('#paymentBrick_container iframe');
    const count = await iframes.count();

    for (let i = 0; i < count; i++) {
      try {
        const title = await iframes.nth(i).getAttribute('title');
        console.log(`Checking iframe ${i} for CVV: ${title}`);

        const frameLocator = this.page.frameLocator(`#paymentBrick_container iframe >> nth=${i}`);
        const input = frameLocator.locator('input').first();

        try {
          await input.waitFor({ state: 'visible', timeout: 1500 });
          await input.click();
          await input.fill('');
          for (const char of cvv) {
            await input.press(char);
            await sleep(30);
          }
          console.log(`Filled CVV in iframe ${i}`);
          return;
        } catch {
          // Not the right iframe
        }
      } catch (e) {
        console.log(`Error with iframe ${i} for CVV:`, e);
      }
    }

    throw new Error('CVV input not found in any iframe');
  }

  /**
   * Fill cardholder name (native input, not in iframe)
   */
  async fillCardholderName(name: string): Promise<void> {
    // Native input with name="HOLDER_NAME"
    const selectors = [
      'input[name="HOLDER_NAME"]',
      '#paymentBrick_container input[name="HOLDER_NAME"]',
      'input[placeholder*="María"]',
      'input[placeholder*="López"]',
    ];

    for (const selector of selectors) {
      const input = this.page.locator(selector);
      const count = await input.count();
      if (count > 0) {
        await input.first().click();
        await input.first().fill(name);
        console.log(`Filled cardholder name using selector: ${selector}`);
        return;
      }
    }

    throw new Error('Cardholder name input not found');
  }

  /**
   * Fill document number (DNI) - native input, not in iframe
   */
  async fillDocNumber(docNumber: string): Promise<void> {
    // Native input with name="DOCUMENT"
    const selectors = [
      'input[name="DOCUMENT"]',
      '#paymentBrick_container input[name="DOCUMENT"]',
      'input[placeholder*="99999"]',
    ];

    for (const selector of selectors) {
      const input = this.page.locator(selector);
      const count = await input.count();
      if (count > 0) {
        await input.first().click();
        await input.first().fill(docNumber);
        console.log(`Filled doc number using selector: ${selector}`);
        return;
      }
    }

    throw new Error('Document number input not found');
  }

  /**
   * Fill email - native input, not in iframe
   */
  async fillEmail(email: string): Promise<void> {
    // Native input with name="EMAIL"
    const selectors = [
      'input[name="EMAIL"]',
      '#paymentBrick_container input[name="EMAIL"]',
      'input[placeholder*="ejemplo@email"]',
      'input[placeholder*="ejemplo@"]',
    ];

    for (const selector of selectors) {
      const input = this.page.locator(selector);
      const count = await input.count();
      if (count > 0) {
        await input.first().click();
        await input.first().fill(email);
        console.log(`Filled email using selector: ${selector}`);
        return;
      }
    }

    throw new Error('Email input not found');
  }

  /**
   * Fill complete card form
   */
  async fillCardForm(cardData: TestCardData): Promise<void> {
    console.log('Filling MercadoPago card form...');

    await this.fillCardNumber(cardData.number);
    await sleep(500);

    await this.fillExpiration(cardData.expiry);
    await sleep(500);

    await this.fillCvv(cardData.cvv);
    await sleep(500);

    await this.fillCardholderName(cardData.holder);
    await sleep(500);

    await this.fillDocNumber(cardData.docNumber);
    await sleep(500);

    await this.fillEmail(cardData.email);
    await sleep(500);

    console.log('Card form filled successfully');
  }

  /**
   * Submit the payment form
   */
  async submitMPForm(): Promise<void> {
    const selectors = [
      'button:has-text("Pagar")',
      'button[type="submit"]',
      '#form-checkout__submit',
      '.mp-button',
    ];

    for (const selector of selectors) {
      const button = this.page.locator(selector);
      const count = await button.count();
      if (count > 0) {
        await button.first().click();
        console.log(`Clicked submit using selector: ${selector}`);
        return;
      }
    }

    throw new Error('Submit button not found');
  }

  /**
   * Legacy method for backward compatibility
   */
  async getMPFrame(): Promise<null> {
    // Form is not in iframe, return null
    console.log('Note: MP form is native, not in iframe');
    return null;
  }

  // ==================== ACTIONS ====================

  /**
   * Click confirm and pay button
   */
  async clickConfirmPay(): Promise<void> {
    await this.click(this.payment.confirmPayBtn);
  }

  /**
   * Click download PDF button
   */
  async clickDownloadPdf(): Promise<void> {
    await this.click(this.payment.downloadPdfBtn);
  }

  /**
   * Click alternative payment (efectivo/transferencia)
   */
  async clickAlternativePayment(): Promise<void> {
    await this.click(this.payment.mpAlternativeBtn);
  }

  /**
   * Click retry button on error
   */
  async clickRetry(): Promise<void> {
    await this.click(this.payment.retryButton);
  }

  /**
   * Check if payment is processing
   */
  async isProcessing(): Promise<boolean> {
    return this.isVisible(this.payment.processingSpinner);
  }

  /**
   * Wait for payment processing to complete
   */
  async waitForProcessingComplete(timeout = 60000): Promise<void> {
    // First wait for processing to start
    try {
      await this.page.waitForSelector(this.payment.processingSpinner, {
        state: 'visible',
        timeout: 5000,
      });
    } catch {
      // Processing might have already started and finished
    }

    // Then wait for it to finish
    try {
      await this.page.waitForSelector(this.payment.processingSpinner, {
        state: 'hidden',
        timeout,
      });
    } catch {
      // Check if we redirected (success)
      if (!this.isOnPaymentPage()) {
        return; // Success - redirected
      }
      throw new Error('Payment processing timed out');
    }
  }

  // ==================== FULL PAYMENT FLOW ====================

  /**
   * Complete full payment flow with card
   */
  async completePaymentWithCard(cardData: TestCardData): Promise<void> {
    // 1. Ensure direct payment is selected
    await this.selectDirectPayment();

    // 2. Wait for MP brick to be ready
    await this.waitForMPBrickReady();

    // 3. Fill card form
    await this.fillCardForm(cardData);

    // 4. Submit the MP brick form (this generates token)
    await this.submitMPForm();

    // 5. Wait for token generation and payment processing
    await this.waitForProcessingComplete();
  }

  /**
   * Go to MercadoPago checkout (redirect flow)
   */
  async goToMPCheckout(): Promise<void> {
    await this.clickAlternativePayment();

    // Wait for redirect to MercadoPago
    await this.page.waitForURL(/mercadopago|mercadolibre/, {
      timeout: 30000,
    });
  }

  // ==================== ASSERTIONS ====================

  /**
   * Assert page loaded successfully
   */
  async assertPageLoaded(): Promise<void> {
    await this.waitForPageLoaded();

    const hasTitle = await this.isVisible(this.payment.pageTitle);
    if (!hasTitle) {
      throw new Error('Payment page title not found');
    }

    const hasCarBrand = await this.isVisible(this.payment.carBrand);
    if (!hasCarBrand) {
      throw new Error('Car brand not displayed');
    }
  }

  /**
   * Assert MP brick is ready (native form, not iframe)
   */
  async assertMPBrickReady(): Promise<void> {
    await this.waitForMPFormReady();

    // Verify form inputs exist
    const isLoaded = await this.isMPFormLoaded();
    if (!isLoaded) {
      throw new Error('MercadoPago form not loaded');
    }
  }

  /**
   * Assert car info is displayed
   */
  async assertCarInfoDisplayed(): Promise<void> {
    const brand = await this.getCarBrand();
    const model = await this.getCarModel();

    if (!brand || !model) {
      throw new Error('Car info not displayed');
    }
  }

  /**
   * Assert totals are displayed
   */
  async assertTotalsDisplayed(): Promise<void> {
    const usd = await this.getTotalUsd();
    const ars = await this.getTotalArs();

    if (!usd || !ars) {
      throw new Error('Payment totals not displayed');
    }
  }

  /**
   * Assert error is displayed
   */
  async assertErrorDisplayed(expectedMessage?: string): Promise<void> {
    const hasError = await this.hasError();
    if (!hasError) {
      throw new Error('Expected error state but none found');
    }

    if (expectedMessage) {
      const actualMessage = await this.getErrorMessage();
      if (!actualMessage.includes(expectedMessage)) {
        throw new Error(`Expected error "${expectedMessage}", got "${actualMessage}"`);
      }
    }
  }

  /**
   * Assert redirected to success page
   */
  async assertPaymentSuccess(): Promise<void> {
    await this.page.waitForURL(/\/bookings\/.*\/success/, {
      timeout: 30000,
    });
  }
}
