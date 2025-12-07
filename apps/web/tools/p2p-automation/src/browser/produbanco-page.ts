import type { Page, Frame } from 'playwright';
import { createServiceLogger } from '../utils/logger.js';
import { sleep } from '../utils/retry.js';
import type { TransferResult } from '../types/index.js';

const logger = createServiceLogger('produbanco-page');

/**
 * Bank codes for Produbanco transfers
 * VERIFIED 05-Dec-2025 from SELECT#cbxBanco dropdown
 */
export const BANK_CODES = {
  PRODUBANCO: '36',
  PICHINCHA: '10',
  PACIFICO: '30',        // Banco del Pacífico
  GUAYAQUIL: '17',
  BOLIVARIANO: '37',
  INTERNACIONAL: '32',
  AMAZONAS: '34',
} as const;

export type BankCode = typeof BANK_CODES[keyof typeof BANK_CODES];

/**
 * ProdubancoPage - Automation for Produbanco Empresas (Ecuador)
 *
 * IMPORTANT: Produbanco uses iframes for main content.
 * All interactions must go through the iframe#iframe_a
 *
 * Authentication requires manual 2FA with Identity Token.
 */
export class ProdubancoPage {
  private page: Page;
  private iframeSelector = 'iframe#iframe_a';

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Get the main content iframe
   * Produbanco renders all main content inside iframe#iframe_a
   */
  private async getIframe(): Promise<Frame | null> {
    try {
      const frameElement = await this.page.$(this.iframeSelector);
      if (!frameElement) {
        logger.warn('Iframe not found');
        return null;
      }
      const frame = await frameElement.contentFrame();
      return frame;
    } catch (error) {
      logger.error(`Failed to get iframe: ${error}`);
      return null;
    }
  }

  /**
   * Execute a function inside the iframe
   */
  private async inIframe<T>(fn: (frame: Frame) => Promise<T>): Promise<T | null> {
    const frame = await this.getIframe();
    if (!frame) {
      logger.error('Cannot execute in iframe - iframe not found');
      return null;
    }
    return fn(frame);
  }

  /**
   * Verify Produbanco session is active
   * Returns true if user is logged in and on dashboard
   */
  async verifySession(): Promise<boolean> {
    try {
      await this.page.goto('https://www.produbanco.com/Produnet/Home', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await sleep(3000);

      // Check URL - if redirected to login, session is expired
      const url = this.page.url();
      if (url.includes('produnet/?') || url.includes('login') || url.includes('qsBanca')) {
        logger.warn('Produbanco session expired - needs login');
        return false;
      }

      // Check for dashboard elements in iframe
      const hasBalance = await this.inIframe(async (frame) => {
        const balance = await frame.$('text=Saldo disponible') ||
                        await frame.$('text=Cuenta Pro Pyme') ||
                        await frame.$('text=Resumen');
        return !!balance;
      });

      if (hasBalance) {
        logger.info('Produbanco session is active');
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Session verification failed: ${error}`);
      return false;
    }
  }

  /**
   * Navigate to the Transfers page
   */
  async navigateToTransfers(): Promise<boolean> {
    try {
      // Click on Transferencias menu in the sidebar (outside iframe)
      const menuSelector = 'text=Transferencias';
      await this.page.waitForSelector(menuSelector, { timeout: 10000 });
      await this.page.click(menuSelector);
      await sleep(1500);

      // Click on Transferencias submenu
      const submenu = await this.page.$$('text=Transferencias');
      if (submenu.length >= 2) {
        await submenu[1].click(); // Second one is the submenu item
      }
      await sleep(2000);

      logger.info('Navigated to Transfers page');
      return true;
    } catch (error) {
      logger.error(`Failed to navigate to transfers: ${error}`);
      return false;
    }
  }

  /**
   * Select "A un nuevo contacto" option for new recipient transfer
   */
  async selectNewContact(): Promise<boolean> {
    try {
      return await this.inIframe(async (frame) => {
        // Find and click the "A un nuevo contacto" card
        // Class: wp-opcion-transferencia
        const cards = await frame.$$('.wp-opcion-transferencia');
        if (cards.length > 0) {
          await cards[0].click(); // First card is "A un nuevo contacto"
          await sleep(2000);
          logger.info('Selected "A un nuevo contacto"');
          return true;
        }

        // Fallback: try text search
        const newContactCard = await frame.$('text=A un nuevo contacto');
        if (newContactCard) {
          await newContactCard.click();
          await sleep(2000);
          logger.info('Selected "A un nuevo contacto" via text');
          return true;
        }

        logger.error('Could not find "A un nuevo contacto" option');
        return false;
      }) ?? false;
    } catch (error) {
      logger.error(`Failed to select new contact: ${error}`);
      return false;
    }
  }

  /**
   * Fill recipient data - Step 1 of transfer
   *
   * IMPORTANT: For PRODUBANCO→PRODUBANCO transfers, only account number is required.
   * Other banks require additional fields (ID, name, etc.)
   *
   * VERIFIED 05-Dec-2025: Test transfer $1.00 USD - Comprobante #97377269
   */
  async fillRecipientData(params: {
    bankCode: string;
    accountType?: 'ahorros' | 'corriente';  // Optional - auto-detected for Produbanco
    accountNumber: string;
    idType?: 'cedula' | 'pasaporte' | 'ruc';
    idNumber?: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
  }): Promise<boolean> {
    logger.info(`Filling recipient data: bank=${params.bankCode}, account=${params.accountNumber}`);

    const isProdubanco = params.bankCode === BANK_CODES.PRODUBANCO;

    try {
      return await this.inIframe(async (frame) => {
        // 1. Select destination bank from dropdown
        const bankSelect = await frame.$('#cbxBanco');
        if (!bankSelect) {
          // Try alternative selectors
          const altBank = await frame.$('select[name*="banco"], select[id*="banco"]');
          if (altBank) {
            await altBank.selectOption(params.bankCode);
          } else {
            logger.error('Bank selector not found');
            return false;
          }
        } else {
          await bankSelect.selectOption(params.bankCode);
        }
        await sleep(800);  // Wait for dynamic form to update

        // 2. Enter account number (required for all banks)
        const accountInput = await frame.$('input[name="numeroCuenta"]') ||
                            await frame.$('input[id*="cuenta"], input[placeholder*="cuenta"]');
        if (!accountInput) {
          logger.error('Account number input not found');
          return false;
        }
        await accountInput.fill(params.accountNumber);
        await sleep(500);

        // For PRODUBANCO→PRODUBANCO: Just account number is enough
        if (isProdubanco) {
          logger.info('PRODUBANCO→PRODUBANCO: Only account number needed');
          return true;
        }

        // For OTHER BANKS: Need additional fields
        logger.info('Other bank transfer: filling additional required fields');

        // 3. Account type (if field exists)
        const accountTypeSelect = await frame.$('#cbxTipoCuenta');
        if (accountTypeSelect && params.accountType) {
          const accountTypeValue = params.accountType === 'ahorros' ? 'AHO' : 'COR';
          await accountTypeSelect.selectOption(accountTypeValue);
          await sleep(300);
        }

        // 4. ID type selection (radio buttons)
        if (params.idType) {
          const idTypeMap: Record<string, string> = {
            cedula: 'radCedula',
            pasaporte: 'radPasaporte',
            ruc: 'radRucRise',
          };
          const radioSelector = `input[name="${idTypeMap[params.idType]}"]`;
          const radioBtn = await frame.$(radioSelector);
          if (radioBtn) {
            await radioBtn.click();
            await sleep(300);
          }
        }

        // 5. Enter ID number
        if (params.idNumber) {
          const idInput = await frame.$('input[name="identificacion"]') ||
                         await frame.$('input[id*="identificacion"], input[id*="cedula"]');
          if (idInput) {
            await idInput.fill(params.idNumber);
            await sleep(300);
          }
        }

        // 6. Enter name (person or company)
        if (params.companyName) {
          const companyInput = await frame.$('input[name="razonSocial"]');
          if (companyInput) {
            await companyInput.fill(params.companyName);
          }
        } else {
          if (params.lastName) {
            const lastNameInput = await frame.$('input[name="apellidos"]');
            if (lastNameInput) await lastNameInput.fill(params.lastName);
          }
          if (params.firstName) {
            const firstNameInput = await frame.$('input[name="nombres"]');
            if (firstNameInput) await firstNameInput.fill(params.firstName);
          }
        }
        await sleep(300);

        logger.info('Recipient data filled successfully');
        return true;
      }) ?? false;
    } catch (error) {
      logger.error(`Failed to fill recipient data: ${error}`);
      return false;
    }
  }

  /**
   * Click "Verificar datos" button to validate recipient
   * Returns true if verification passes
   */
  async verifyRecipient(): Promise<boolean> {
    try {
      return await this.inIframe(async (frame) => {
        // Click verify button
        const verifyBtn = await frame.$('button:has-text("Verificar datos")');
        if (!verifyBtn) {
          logger.error('Verify button not found');
          return false;
        }

        await verifyBtn.click();
        await sleep(3000);

        // Check for errors
        const errorMsg = await frame.$('.error, .alert-danger, text=Error');
        if (errorMsg) {
          const errorText = await errorMsg.textContent();
          logger.error(`Verification failed: ${errorText}`);
          return false;
        }

        // Check for success (next step fields should appear)
        const amountField = await frame.$('input[name="monto"], input[name="valor"]');
        if (amountField) {
          logger.info('Recipient verified successfully');
          return true;
        }

        // Check for confirmation message
        const confirmed = await frame.$('text=Datos verificados, text=Confirmado');
        if (confirmed) {
          logger.info('Recipient verified successfully');
          return true;
        }

        logger.warn('Verification result unknown');
        return false;
      }) ?? false;
    } catch (error) {
      logger.error(`Recipient verification failed: ${error}`);
      return false;
    }
  }

  /**
   * Fill transfer amount and description - Step 2 of transfer
   *
   * This step appears AFTER clicking "Verificar datos" button.
   * The form shows "Ingresar monto" heading.
   *
   * VERIFIED 05-Dec-2025: Amount field appears after verification step
   */
  async fillTransferAmount(amount: number, description: string): Promise<boolean> {
    logger.info(`Setting transfer amount: $${amount}`);

    try {
      return await this.inIframe(async (frame) => {
        // Wait for amount form to be visible (appears after verification)
        await sleep(1500);

        // Look for amount field with multiple fallback selectors
        const amountSelectors = [
          'input[name="monto"]',
          'input[name="valor"]',
          'input[id*="monto"]',
          'input[id*="valor"]',
          'input[id*="amount"]',
          'input[placeholder*="monto"]',
          'input[placeholder*="valor"]',
          // Produbanco specific patterns
          'input.input-monto',
          'input[type="number"]',
          'input[type="text"][inputmode="decimal"]',
        ];

        let amountInput = null;
        for (const selector of amountSelectors) {
          amountInput = await frame.$(selector);
          if (amountInput) {
            const isVisible = await amountInput.isVisible();
            if (isVisible) {
              logger.info(`Found amount input with selector: ${selector}`);
              break;
            }
            amountInput = null;
          }
        }

        if (!amountInput) {
          // Try finding by label text "Ingresar monto" or "Monto"
          const labels = await frame.$$('label');
          for (const label of labels) {
            const text = await label.textContent();
            if (text?.toLowerCase().includes('monto') || text?.toLowerCase().includes('valor')) {
              const forAttr = await label.getAttribute('for');
              if (forAttr) {
                amountInput = await frame.$(`#${forAttr}`);
                if (amountInput) {
                  logger.info(`Found amount input via label: ${text}`);
                  break;
                }
              }
            }
          }
        }

        if (!amountInput) {
          logger.error('Amount input not found after trying all selectors');
          // Take screenshot for debugging
          await this.page.screenshot({ path: '/tmp/produbanco_amount_notfound.png' });
          return false;
        }

        // Clear and fill amount (use string format for decimal values)
        await amountInput.fill('');
        await amountInput.fill(amount.toFixed(2));
        await sleep(500);

        // Fill description/concept if field exists
        const descSelectors = [
          'input[name="concepto"]',
          'input[name="descripcion"]',
          'input[name="referencia"]',
          'input[name="detalle"]',
          'textarea[name="concepto"]',
          'textarea[name="descripcion"]',
          'input[placeholder*="concepto"]',
          'input[placeholder*="referencia"]',
        ];

        for (const selector of descSelectors) {
          const descInput = await frame.$(selector);
          if (descInput) {
            const isVisible = await descInput.isVisible();
            if (isVisible) {
              await descInput.fill(description);
              logger.info(`Filled description field: ${selector}`);
              break;
            }
          }
        }

        logger.info(`Transfer amount filled: $${amount.toFixed(2)}`);
        return true;
      }) ?? false;
    } catch (error) {
      logger.error(`Failed to fill transfer amount: ${error}`);
      await this.page.screenshot({ path: '/tmp/produbanco_amount_error.png' });
      return false;
    }
  }

  /**
   * Click the confirm/continue button after filling amount
   * Returns true if found and clicked
   */
  async clickContinue(): Promise<boolean> {
    try {
      return await this.inIframe(async (frame) => {
        // Common button selectors for "Continuar" or "Transferir"
        const buttonSelectors = [
          'button:has-text("Continuar")',
          'button:has-text("Transferir")',
          'button:has-text("Confirmar")',
          'button:has-text("Siguiente")',
          'button[type="submit"]',
          'input[type="submit"]',
          '.btn-primary',
          '.btn-transferir',
        ];

        for (const selector of buttonSelectors) {
          const btn = await frame.$(selector);
          if (btn) {
            const isVisible = await btn.isVisible();
            const isEnabled = await btn.isEnabled();
            if (isVisible && isEnabled) {
              logger.info(`Clicking continue button: ${selector}`);
              await btn.click();
              await sleep(2000);
              return true;
            }
          }
        }

        logger.warn('Continue button not found or not enabled');
        return false;
      }) ?? false;
    } catch (error) {
      logger.error(`Failed to click continue: ${error}`);
      return false;
    }
  }

  /**
   * Extract transfer receipt/comprobante number from success page
   */
  async extractReceiptNumber(): Promise<string | null> {
    try {
      return await this.inIframe(async (frame) => {
        // Look for receipt number in success message
        const patterns = [
          /comprobante[:\s]*(?:nro\.?|n°|#)?\s*(\d+)/i,
          /n(?:ú|u)mero de transacci(?:ó|o)n[:\s]*(\d+)/i,
          /referencia[:\s]*(\d+)/i,
        ];

        const pageText = await frame.evaluate(() => document.body.innerText);

        for (const pattern of patterns) {
          const match = pageText.match(pattern);
          if (match) {
            logger.info(`Found receipt number: ${match[1]}`);
            return match[1];
          }
        }

        // Try specific element selectors
        const receiptSelectors = [
          '.comprobante-numero',
          '.numero-transaccion',
          '[data-comprobante]',
        ];

        for (const selector of receiptSelectors) {
          const el = await frame.$(selector);
          if (el) {
            const text = await el.textContent();
            const numMatch = text?.match(/(\d+)/);
            if (numMatch) {
              return numMatch[1];
            }
          }
        }

        return null;
      });
    } catch (error) {
      logger.error(`Failed to extract receipt: ${error}`);
      return null;
    }
  }

  /**
   * Check if we're on the success page
   */
  async isOnSuccessPage(): Promise<boolean> {
    try {
      return await this.inIframe(async (frame) => {
        const successIndicators = [
          'text=Transferencia exitosa',
          'text=Transacción exitosa',
          'text=exitosa',
          '.success-message',
          '.transferencia-exitosa',
        ];

        for (const selector of successIndicators) {
          const el = await frame.$(selector);
          if (el) {
            const isVisible = await el.isVisible();
            if (isVisible) return true;
          }
        }
        return false;
      }) ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Execute the complete transfer flow
   *
   * Flow verified 05-Dec-2025:
   * 1. Navigate to Transferencias
   * 2. Select "A un nuevo contacto"
   * 3. Select bank + Enter account number
   * 4. Click "Verificar datos"
   * 5. Enter amount (appears after verification)
   * 6. Confirm (may require 2FA Token de Identidad)
   * 7. Success page with comprobante
   */
  async executeTransfer(params: {
    bankCode: string;
    accountType?: 'ahorros' | 'corriente';
    accountNumber: string;
    idType?: 'cedula' | 'pasaporte' | 'ruc';
    idNumber?: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    amount: number;
    description: string;
  }): Promise<TransferResult> {
    logger.info(`Starting Produbanco transfer: $${params.amount} -> ${params.accountNumber}`);
    logger.info(`Target bank code: ${params.bankCode}`);

    try {
      // Step 1: Navigate to transfers
      logger.info('Step 1: Navigating to transfers...');
      const navSuccess = await this.navigateToTransfers();
      if (!navSuccess) {
        return { success: false, error: 'Failed to navigate to transfers' };
      }

      // Step 2: Select new contact
      logger.info('Step 2: Selecting new contact...');
      const selectSuccess = await this.selectNewContact();
      if (!selectSuccess) {
        return { success: false, error: 'Failed to select new contact option' };
      }

      // Step 3: Fill recipient data (bank + account)
      logger.info('Step 3: Filling recipient data...');
      const fillSuccess = await this.fillRecipientData({
        bankCode: params.bankCode,
        accountType: params.accountType,
        accountNumber: params.accountNumber,
        idType: params.idType,
        idNumber: params.idNumber,
        firstName: params.firstName,
        lastName: params.lastName,
        companyName: params.companyName,
      });
      if (!fillSuccess) {
        return { success: false, error: 'Failed to fill recipient data' };
      }

      // Step 4: Verify recipient (click "Verificar datos")
      logger.info('Step 4: Verifying recipient...');
      const verifySuccess = await this.verifyRecipient();
      if (!verifySuccess) {
        return { success: false, error: 'Failed to verify recipient' };
      }

      // Step 5: Fill amount (appears after verification)
      logger.info('Step 5: Filling transfer amount...');
      const amountSuccess = await this.fillTransferAmount(params.amount, params.description);
      if (!amountSuccess) {
        return { success: false, error: 'Failed to fill transfer amount' };
      }

      // Step 6: Click continue/confirm
      logger.info('Step 6: Clicking continue...');
      await this.clickContinue();
      await sleep(2000);

      // Check if 2FA is required (Token de Identidad)
      const needs2FA = await this.inIframe(async (frame) => {
        const tokenIndicators = [
          'text=Token de Identidad',
          'text=Ingrese el código',
          'text=OTP',
          'input[name="token"]',
          'input[name="otp"]',
          'input[placeholder*="token"]',
        ];
        for (const selector of tokenIndicators) {
          const el = await frame.$(selector);
          if (el && await el.isVisible()) return true;
        }
        return false;
      });

      if (needs2FA) {
        logger.warn('⚠️ MANUAL 2FA REQUIRED - Token de Identidad');
        await this.page.screenshot({ path: '/tmp/produbanco_2fa_required.png' });
        return {
          success: false,
          qrRequired: true,
          error: 'Manual confirmation with Token de Identidad required',
        };
      }

      // Check if on success page
      await sleep(2000);
      const isSuccess = await this.isOnSuccessPage();

      if (isSuccess) {
        const receipt = await this.extractReceiptNumber();
        logger.info(`✅ Transfer completed! Receipt: ${receipt}`);
        await this.page.screenshot({ path: '/tmp/produbanco_success.png' });

        return {
          success: true,
          transferId: receipt || undefined,
        };
      }

      // Unknown state - take screenshot for debugging
      logger.warn('Transfer state unknown - taking screenshot');
      await this.page.screenshot({ path: '/tmp/produbanco_unknown_state.png' });

      return {
        success: false,
        error: 'Transfer completed but could not confirm success',
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Transfer failed: ${errorMsg}`);
      await this.page.screenshot({ path: '/tmp/produbanco_error.png' });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Get current account balance from dashboard
   */
  async getAccountBalance(): Promise<number | null> {
    try {
      // Navigate to home/dashboard
      await this.page.goto('https://www.produbanco.com/Produnet/Home', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await sleep(2000);

      return await this.inIframe(async (frame) => {
        // Look for balance text
        const balanceText = await frame.$eval(
          'text=/\\$[\\d,.]+/',
          (el) => el.textContent
        ).catch(() => null);

        if (balanceText) {
          // Parse: "$647.24" -> 647.24
          const match = balanceText.match(/\$?([\d,.]+)/);
          if (match) {
            const value = parseFloat(match[1].replace(',', ''));
            logger.info(`Account balance: $${value}`);
            return value;
          }
        }

        logger.warn('Could not extract balance');
        return null;
      });
    } catch (error) {
      logger.error(`Failed to get balance: ${error}`);
      return null;
    }
  }
}

export default ProdubancoPage;
