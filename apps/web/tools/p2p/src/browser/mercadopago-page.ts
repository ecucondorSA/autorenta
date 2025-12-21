import type { Page } from 'playwright';
import { createServiceLogger } from '../utils/logger.js';
import { sleep } from '../utils/retry.js';
import type { TransferResult } from '../types/index.js';

const logger = createServiceLogger('mp-page');

export class MercadoPagoPage {
  constructor(private page: Page) {}

  /**
   * Verify MercadoPago session is active
   */
  async verifySession(): Promise<boolean> {
    try {
      await this.page.goto('https://www.mercadopago.com.ar/home', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await sleep(2000);

      // Check if logged in (home should have user balance)
      const loggedIn = await this.page.$('text=Saldo') ||
                       await this.page.$('text=Transferir') ||
                       await this.page.$('text=Tu dinero');

      if (loggedIn) {
        logger.info('MercadoPago session is active');
        return true;
      }

      // Check if redirected to login
      const url = this.page.url();
      if (url.includes('login') || url.includes('auth')) {
        logger.warn('MercadoPago session expired - needs login');
        return false;
      }

      return false;
    } catch (error) {
      logger.error(`Session verification failed: ${error}`);
      return false;
    }
  }

  /**
   * Set amount using keyboard simulation - the CORRECT way for React controlled inputs.
   *
   * MercadoPago uses React controlled components with internal _valueTracker.
   * Direct DOM manipulation or calling onChange doesn't work because React
   * compares with _valueTracker and ignores changes if they match.
   *
   * SOLUTION: Use real keyboard simulation which triggers proper React events.
   *
   * Reference: https://stackoverflow.com/questions/47136896/
   */
  async setAmount(amount: number): Promise<boolean> {
    // Format amount for Argentina: use comma as decimal separator
    // e.g., 20.53 -> "20,53"
    const amountStr = amount.toFixed(2).replace('.', ',');
    // For verification, keep the integer part
    const amountInt = Math.floor(amount);
    logger.info(`Setting amount: ${amount} (formatted: ${amountStr}) using keyboard simulation`);

    try {
      // Find the amount input selector
      const inputSelector = '#amount-field-input';

      // STEP 1: Click to focus the input (triple click to select all)
      logger.debug('Triple-clicking input to select all...');
      await this.page.click(inputSelector, { clickCount: 3 });
      await sleep(500);

      // STEP 2: Delete any existing content
      logger.debug('Pressing Backspace to clear...');
      await this.page.keyboard.press('Backspace');
      await sleep(300);

      // STEP 2b: Also try Delete key
      await this.page.keyboard.press('Delete');
      await sleep(300);

      // STEP 3: Type the amount DIGIT BY DIGIT with generous delay
      // The delay is CRITICAL for React to process each keystroke
      logger.debug(`Typing amount digit by digit: ${amountStr}`);
      for (const digit of amountStr) {
        await this.page.keyboard.press(digit as any);
        await sleep(150);  // 150ms between each digit
      }
      await sleep(500);

      // STEP 4: Verify the amount was entered correctly
      const verifyResult = await this.verifyAmountInput(amountInt);

      if (!verifyResult.success) {
        logger.warn(`Keyboard method failed, trying native setter fallback...`);

        // FALLBACK: Use native value setter + _valueTracker reset
        const fallbackResult = await this.setAmountNativeSetter(amountStr);
        if (!fallbackResult) {
          logger.error('Both keyboard and native setter methods failed');
          return false;
        }

        // Verify again after fallback
        const verifyFallback = await this.verifyAmountInput(amountInt);
        if (!verifyFallback.success) {
          logger.error(`Fallback also failed. Displayed: ${verifyFallback.displayed}, Expected: ${amountInt}`);
          await this.page.screenshot({ path: '/tmp/mp_amount_error.png' });
          return false;
        }
      }

      logger.info(`Amount ${amountInt} set and verified successfully`);
      return true;

    } catch (error) {
      logger.error(`setAmount failed: ${error}`);
      await this.page.screenshot({ path: '/tmp/mp_amount_error.png' });
      return false;
    }
  }

  /**
   * Fallback method using native value setter + _valueTracker reset
   * This bypasses React's controlled component override
   */
  private async setAmountNativeSetter(value: string): Promise<boolean> {
    logger.debug(`Using native setter for value: ${value}`);

    const result = await this.page.evaluate((val: string) => {
      // Find the input
      const input = document.getElementById('amount-field-input') as HTMLInputElement;
      if (!input) return { success: false, error: 'input not found' };

      try {
        // Store the last value for _valueTracker
        const lastValue = input.value;

        // Get the NATIVE setter from HTMLInputElement prototype
        // This bypasses React's override on the instance
        const nativeSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;

        if (!nativeSetter) {
          return { success: false, error: 'native setter not found' };
        }

        // Use native setter to change the value
        nativeSetter.call(input, val);

        // CRITICAL: Reset React's _valueTracker with the PREVIOUS value
        // This forces React to see the change as "new"
        const tracker = (input as any)._valueTracker;
        if (tracker) {
          tracker.setValue(lastValue);
        }

        // Dispatch input event with bubbles:true so React captures it
        const inputEvent = new Event('input', { bubbles: true });
        input.dispatchEvent(inputEvent);

        // Also dispatch change event for good measure
        const changeEvent = new Event('change', { bubbles: true });
        input.dispatchEvent(changeEvent);

        return { success: true, value: input.value };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    }, value);

    if (!result.success) {
      logger.error(`Native setter failed: ${result.error}`);
      return false;
    }

    logger.debug(`Native setter result: ${JSON.stringify(result)}`);
    return true;
  }

  /**
   * Verify that the amount input displays the expected value
   * Returns the displayed value for debugging
   */
  private async verifyAmountInput(expectedAmount: number): Promise<{ success: boolean; displayed: string }> {
    await sleep(300);

    const displayed = await this.page.evaluate((): { inputValue: string; visualText: string } => {
      const input = document.getElementById('amount-field-input') as HTMLInputElement;
      if (!input) return { inputValue: '', visualText: '' };

      // Also check the visual display (might be formatted differently)
      const displayElement = document.querySelector('[class*="amount"]');
      const visualText = displayElement?.textContent || '';

      return {
        inputValue: input.value,
        visualText: visualText,
      };
    });

    // Extract numbers only for comparison
    const inputNumbers = (displayed.inputValue || '').replace(/\D/g, '');
    const expectedStr = String(expectedAmount);

    logger.debug(`Verification - Input: "${displayed.inputValue}", Visual: "${displayed.visualText}", Expected: ${expectedAmount}`);

    // Check if the numbers match (ignoring formatting like dots/commas)
    const success = inputNumbers === expectedStr || inputNumbers.includes(expectedStr);

    return {
      success,
      displayed: displayed.inputValue || displayed.visualText || 'empty',
    };
  }

  /**
   * Verify an incoming transaction for P2P Release Safety
   * CRITICAL: Validates Amount, Status, and Sender Name (Anti-Fraud)
   */
  async verifyIncomingTransaction(expectedAmount: number, expectedSenderName: string): Promise<{
    verified: boolean;
    details?: { sender: string; amount: number; date: string; status: string };
    error?: string;
  }> {
    logger.info(`🛡️ SECURITY CHECK: Verifying incoming payment of $${expectedAmount} from "${expectedSenderName}"`);

    try {
      // 1. Go to Activities (Use specific filter for money in if possible to reduce noise)
      await this.page.goto('https://www.mercadopago.com.ar/activities?q=money_in', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await sleep(3000); // Allow list to load

      // 2. Scan the activity list
      // We look for the most recent transaction that matches the amount
      const transactions = await this.page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('div[class*="activity-row"]'));
        return rows.map(row => {
          const amountText = row.querySelector('[class*="amount"]')?.textContent || '';
          const title = row.querySelector('[class*="title"]')?.textContent || '';
          const subtitle = row.querySelector('[class*="subtitle"]')?.textContent || '';
          const status = row.querySelector('[class*="status"]')?.textContent || 'approved'; // Default to approved if no status badge (common in MP)
          
          // Parse amount: "$ 25.351,00" -> 25351.00
          const amountClean = amountText.replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.');
          
          return {
            amount: parseFloat(amountClean),
            title,
            subtitle, // Often contains sender name
            status: status.toLowerCase(),
            raw: row.innerText
          };
        });
      });

      logger.info(`Scanned ${transactions.length} recent transactions`);

      // 3. Filter candidates by Amount (allow 0.10 diff for rounding)
      const candidates = transactions.filter(t => 
        Math.abs(t.amount - expectedAmount) < 0.10 && 
        !t.raw.includes('-') // Ensure it's positive (money in)
      );

      if (candidates.length === 0) {
        logger.warn(`❌ No transaction found for amount $${expectedAmount}`);
        return { verified: false, error: 'Transaction not found with correct amount' };
      }

      // 4. Analyze the best candidate (most recent)
      const tx = candidates[0];
      logger.info(`Found candidate transaction: $${tx.amount} - ${tx.title}`);

      // 5. Verify Status
      if (tx.status.includes('pendiente') || tx.status.includes('revisión') || tx.status.includes('pending')) {
        logger.warn(`⚠️ Transaction found but STATUS IS PENDING: ${tx.status}`);
        return { verified: false, error: 'Transaction is pending/in-review' };
      }

      // 6. Verify Sender Name (Deep Fraud Check)
      // Note: In the list view, MP sometimes shows "Transferencia recibida" instead of name.
      // If ambiguous, we might need to click into detail. For now, we check title/subtitle.
      const nameSource = `${tx.title} ${tx.subtitle}`;
      const nameValidation = this.validateRecipientName(expectedSenderName, nameSource);

      if (!nameValidation.valid) {
        // If list view name doesn't match, we MUST click into detail for safety
        logger.info('List view name ambiguous. Clicking for details...');
        // TODO: Implement click-to-detail logic for V2. 
        // For now, we fail safe if name isn't reasonably clear in the list.
        logger.warn(`❌ Sender name mismatch in list view. Found: "${nameSource}", Expected: "${expectedSenderName}"`);
        logger.warn(`Similarity: ${nameValidation.similarity}%`);
        
        return { 
          verified: false, 
          error: `Sender name mismatch (Risk of Triangulation). Found: ${nameSource}` 
        };
      }

      logger.info(`✅ Payment Verified: $${tx.amount} from ${expectedSenderName} (Match: ${nameValidation.similarity}%)`);
      
      return {
        verified: true,
        details: {
          sender: nameSource,
          amount: tx.amount,
          date: 'recent',
          status: 'approved'
        }
      };

    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      logger.error(`Verification error: ${err}`);
      return { verified: false, error: err };
    }
  }

  /**
   * Extract recipient information from the confirmation page
   * This is shown BEFORE clicking "Confirmar cuenta"
   *
   * MercadoPago page structure:
   * - "Nombre y apellido" label followed by the actual name
   * - "Entidad" label followed by bank name
   */
  private async extractRecipientInfo(): Promise<{ name: string; cuit: string; bank: string }> {
    const info = await this.page.evaluate((): { name: string; cuit: string; bank: string } => {
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);

      let name = '';
      let cuit = '';
      let bank = '';

      // METHOD 1: Find name after "Nombre y apellido" label
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Look for "Nombre y apellido" label - name is on the next line
        if (line.toLowerCase().includes('nombre y apellido') ||
            line.toLowerCase().includes('nombre:') ||
            line.toLowerCase() === 'nombre') {
          // Name should be on next line
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            // Validate it looks like a name (not another label)
            if (!nextLine.includes(':') &&
                !nextLine.toLowerCase().includes('entidad') &&
                !nextLine.toLowerCase().includes('cuit') &&
                nextLine.length > 3) {
              name = nextLine;
              break;
            }
          }
        }
      }

      // METHOD 2: If not found, look for pattern after "Revisá antes de continuar"
      if (!name) {
        let afterRevisa = false;
        for (const line of lines) {
          if (line.includes('Revisá antes de continuar')) {
            afterRevisa = true;
            continue;
          }
          if (afterRevisa) {
            // Skip alias line and labels
            if (line.includes('Alias') || line.includes('ingresado') ||
                line.includes('Entidad') || line.includes('CUIT') ||
                line.includes('Confirmar') || line.includes('Modificar') ||
                line.includes('Volver')) {
              continue;
            }
            // Name is usually 2+ words with letters
            if (line.match(/^[A-Za-záéíóúñÁÉÍÓÚÑ]+ [A-Za-záéíóúñÁÉÍÓÚÑ]+/)) {
              name = line;
              break;
            }
          }
        }
      }

      // Extract CUIT/CUIL
      const cuitMatch = bodyText.match(/CUIT[-\s:]?\s*([\d-]+)/i) ||
                        bodyText.match(/CUIL[-\s:]?\s*([\d-]+)/i) ||
                        bodyText.match(/(\d{2}-\d{8}-\d)/);
      cuit = cuitMatch?.[1] || '';

      // Extract bank/entity name - look for line after "Entidad"
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes('entidad')) {
          if (i + 1 < lines.length) {
            bank = lines[i + 1];
            break;
          }
        }
      }

      // Fallback: look for known bank names
      if (!bank) {
        const bankPatterns = [
          /Personal Pay/i, /Mercado Pago/i, /Banco Galicia/i, /Banco Nación/i,
          /Banco Santander/i, /BBVA/i, /Banco Macro/i, /Brubank/i, /Ualá/i,
          /Naranja X/i, /Banco Ciudad/i, /HSBC/i, /Banco Patagonia/i
        ];
        for (const pattern of bankPatterns) {
          if (pattern.test(bodyText)) {
            bank = bodyText.match(pattern)?.[0] || '';
            break;
          }
        }
      }

      return { name, cuit, bank };
    });

    logger.debug(`Extracted recipient info: name="${info.name}", cuit="${info.cuit}", bank="${info.bank}"`);
    return info;
  }

  /**
   * Validate recipient name using fuzzy matching
   * Binance names might be slightly different from MercadoPago
   * (e.g., "JUAN PEREZ" vs "Juan Pérez" vs "PEREZ JUAN")
   */
  private validateRecipientName(expected: string, actual: string): { valid: boolean; similarity: number } {
    if (!expected || !actual) {
      return { valid: false, similarity: 0 };
    }

    // Normalize both names
    const normalize = (name: string): string[] => {
      return name
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // Remove accents
        .replace(/[^A-Z\s]/g, '')          // Remove non-letters
        .split(/\s+/)
        .filter(word => word.length > 1)   // Remove single letters
        .sort();                            // Sort for order-independent comparison
    };

    const expectedParts = normalize(expected);
    const actualParts = normalize(actual);

    logger.debug(`Comparing names: ${expectedParts.join(' ')} vs ${actualParts.join(' ')}`);

    // Count matching parts
    let matches = 0;
    for (const exp of expectedParts) {
      if (actualParts.some(act => act === exp || act.includes(exp) || exp.includes(act))) {
        matches++;
      }
    }

    // Calculate similarity percentage
    const maxParts = Math.max(expectedParts.length, actualParts.length);
    const similarity = maxParts > 0 ? Math.round((matches / maxParts) * 100) : 0;

    // Consider valid if at least 60% of name parts match
    // This handles cases like "MARIA JOSE GARCIA" vs "GARCIA MARIA"
    const valid = similarity >= 60 || matches >= 2;

    return { valid, similarity };
  }

  /**
   * Execute a transfer to the given destination
   * @param destination CVU/CBU/Alias
   * @param amount Amount in ARS
   * @param expectedName Expected recipient name (from Binance counterparty)
   */
  async executeTransfer(destination: string, amount: number, expectedName?: string): Promise<TransferResult> {
    logger.info(`Starting transfer: $${amount} -> ${destination}`);
    if (expectedName) {
      logger.info(`Expected recipient: ${expectedName}`);
    }

    try {
      // 1. Go to home
      await this.page.goto('https://www.mercadopago.com.ar/home', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await sleep(2000);  // Wait for React to hydrate
      logger.info('Home loaded');

      // 2. Wait for and click Transferir
      await this.page.waitForSelector('text=Transferir', { timeout: 15000 });
      await this.page.click('text=Transferir');
      await sleep(2000);
      logger.info('Clicked Transferir');

      // 3. Click "Con CBU, CVU o alias"
      await this.page.waitForSelector('text=Con CBU, CVU o alias', { timeout: 10000 });
      await this.page.click('text=Con CBU, CVU o alias');
      await sleep(1500);
      logger.info('Selected CBU/CVU/alias');

      // 4. Enter destination - wait for input first
      await this.page.waitForSelector('input', { timeout: 10000 });
      await this.page.fill('input', destination);
      await sleep(500);
      await this.page.click('text=Continuar');
      logger.info(`Entered destination: ${destination}`);

      // 5. Wait for account confirmation and VALIDATE NAME
      await this.page.waitForSelector('text=Confirmar cuenta', { timeout: 15000 });
      await sleep(500);

      // 5.1 CRITICAL: Extract and validate recipient name BEFORE confirming
      if (expectedName) {
        const recipientInfo = await this.extractRecipientInfo();
        logger.info(`MercadoPago shows recipient: "${recipientInfo.name}" (CUIT: ${recipientInfo.cuit})`);

        // Validate name matches (fuzzy match - normalize and compare)
        const nameValidation = this.validateRecipientName(expectedName, recipientInfo.name);
        if (!nameValidation.valid) {
          logger.error(`CRITICAL: Recipient name mismatch!`);
          logger.error(`  Expected (Binance): "${expectedName}"`);
          logger.error(`  Actual (MercadoPago): "${recipientInfo.name}"`);
          logger.error(`  Similarity: ${nameValidation.similarity}%`);
          await this.page.screenshot({ path: '/tmp/mp_name_mismatch.png' });
          return {
            success: false,
            error: `Recipient name mismatch: expected "${expectedName}", got "${recipientInfo.name}"`,
          };
        }
        logger.info(`Name validation PASSED (similarity: ${nameValidation.similarity}%)`);
      } else {
        logger.warn('No expected name provided - skipping name validation (RISKY!)');
      }

      await this.page.click('text=Confirmar cuenta');
      logger.info('Confirmed account');

      // 6. Wait for amount input (try multiple selectors)
      await sleep(2000);  // Wait for page transition
      let amountInputFound = false;
      const amountSelectors = ['#amount-field-input', 'input[inputmode="numeric"]', 'input[type="text"]'];
      for (const selector of amountSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          amountInputFound = true;
          logger.info(`Amount input found with selector: ${selector}`);
          break;
        } catch {
          logger.debug(`Selector ${selector} not found, trying next...`);
        }
      }
      if (!amountInputFound) {
        logger.error('Amount input not found with any selector');
        return { success: false, error: 'Amount input not found' };
      }

      // 7. Set amount using keyboard simulation + verification
      const amountSet = await this.setAmount(amount);
      if (!amountSet) {
        logger.error('CRITICAL: Amount verification failed - aborting transfer to prevent incorrect amount');
        return { success: false, error: 'Failed to set and verify amount' };
      }

      // Extra wait for React state to stabilize
      await sleep(800);

      // 8. Wait for Continue button to be enabled and click it
      logger.info('Waiting for Continuar button to be enabled...');

      // Wait up to 10s for button to become enabled
      let buttonEnabled = false;
      for (let i = 0; i < 20; i++) {
        const isDisabled = await this.page.evaluate(() => {
          // Find button containing "Continuar" text
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b => b.textContent?.includes('Continuar'));
          return btn?.disabled ?? true;
        });

        if (!isDisabled) {
          buttonEnabled = true;
          break;
        }

        logger.debug(`Waiting for Continuar button... attempt ${i + 1}/20`);
        await sleep(500);
      }

      if (!buttonEnabled) {
        logger.error('Continuar button never became enabled - amount may not have been set correctly');
        await this.page.screenshot({ path: '/tmp/mp_continuar_disabled.png' });
        return { success: false, error: 'Continuar button disabled - amount not accepted' };
      }

      await this.page.click('text=Continuar', { timeout: 15000 });
      await this.page.waitForSelector('text=Revisá si está todo bien', { timeout: 15000 });
      logger.info('Review page loaded');

      // 8.5 CRITICAL: Verify amount on review page before final transfer
      const reviewAmount = await this.page.evaluate(() => {
        // Look for the amount in the review summary
        const text = document.body.innerText;
        const match = text.match(/\$\s*([\d.,]+)/);
        return match?.[1] || '';
      });

      // Parse review amount: remove thousand separators (.) and convert decimal separator (,) to (.)
      const reviewAmountClean = reviewAmount.replace(/\./g, '').replace(',', '.');
      const reviewAmountNum = parseFloat(reviewAmountClean) || 0;

      logger.info(`Review page amount: ${reviewAmount} (parsed: ${reviewAmountNum}), Expected: ${amount}`);

      if (Math.abs(reviewAmountNum - amount) > 0.5) {  // Allow 50 cents rounding difference
        logger.error(`CRITICAL: Review page shows WRONG amount! Shown: ${reviewAmountNum}, Expected: ${amount}`);
        await this.page.screenshot({ path: '/tmp/mp_wrong_amount_review.png' });
        return { success: false, error: `Wrong amount on review: ${reviewAmountNum} vs ${amount}` };
      }

      // 9. Execute transfer - click the blue Transferir button
      // Must use Playwright's click() to trigger proper React events
      logger.info('Clicking final Transferir button...');

      // Wait for page to be stable
      await sleep(500);

      // Use multiple fallback strategies for clicking the button
      let clicked = false;

      // Strategy 1: Mouse click at button coordinates (most reliable for problematic buttons)
      try {
        const btnHandle = await this.page.$('button:has-text("Transferir"):not(:has-text("Volver"))');
        if (btnHandle) {
          const box = await btnHandle.boundingBox();
          if (box) {
            // Click at the center of the button using mouse
            const x = box.x + box.width / 2;
            const y = box.y + box.height / 2;
            logger.info(`Clicking at coordinates (${x}, ${y})`);
            await this.page.mouse.click(x, y);
            clicked = true;
            logger.info('Clicked Transferir via mouse.click at coordinates');
          }
        }
      } catch (e) {
        logger.debug(`Mouse click failed: ${e}`);
      }

      // Strategy 2: CSS selector with text
      if (!clicked) {
        try {
          await this.page.click('button:has-text("Transferir"):not(:has-text("Volver"))', { timeout: 3000 });
          clicked = true;
          logger.info('Clicked Transferir via CSS selector');
        } catch {
          logger.debug('CSS selector click failed');
        }
      }

      // Strategy 3: dispatch MouseEvent (triggers React properly)
      if (!clicked) {
        try {
          clicked = await this.page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const transferBtn = buttons.find(btn =>
              btn.textContent?.trim() === 'Transferir' && !btn.disabled
            );
            if (transferBtn) {
              // Dispatch proper mouse events that React listens to
              const rect = transferBtn.getBoundingClientRect();
              const centerX = rect.left + rect.width / 2;
              const centerY = rect.top + rect.height / 2;

              ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                const event = new MouseEvent(eventType, {
                  view: window,
                  bubbles: true,
                  cancelable: true,
                  clientX: centerX,
                  clientY: centerY,
                  button: 0
                });
                transferBtn.dispatchEvent(event);
              });
              return true;
            }
            return false;
          });
          if (clicked) {
            logger.info('Clicked Transferir via MouseEvent dispatch');
          }
        } catch (e) {
          logger.debug(`MouseEvent dispatch failed: ${e}`);
        }
      }

      if (!clicked) {
        throw new Error('Could not click Transferir button with any strategy');
      }

      // Wait for navigation/result with longer timeout
      await sleep(4000);  // MercadoPago processing can be slow

      // 10. Check result
      return await this.checkTransferResult();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Transfer failed: ${errorMsg}`);

      // Take screenshot for debugging
      await this.page.screenshot({ path: '/tmp/mp_transfer_error.png' });

      return { success: false, error: errorMsg };
    }
  }

  /**
   * Check transfer result after clicking final button
   */
  async checkTransferResult(): Promise<TransferResult> {
    // Check for QR requirement
    const qrVisible = await this.page.$('text=Escaneá el QR');
    if (qrVisible) {
      logger.warn('QR verification required');
      return { success: false, qrRequired: true };
    }

    // Check for success
    const successMsg = await this.page.$('text=Le transferiste');
    if (successMsg) {
      // Try to extract transfer ID
      const transferId = await this.page.evaluate(() => {
        const text = document.body.innerText;
        const match = text.match(/Comprobante[:\s]*(\d+)/i);
        return match?.[1] || `MP-${Date.now()}`;
      });

      logger.info(`Transfer successful! ID: ${transferId}`);

      // Take success screenshot
      await this.page.screenshot({ path: '/tmp/mp_transfer_success.png' });

      return { success: true, transferId };
    }

    // Unknown state
    logger.warn('Unknown transfer state');
    await this.page.screenshot({ path: '/tmp/mp_transfer_unknown.png' });

    return { success: false, error: 'Unknown state after transfer' };
  }

  /**
   * Wait for QR to be scanned (with timeout)
   */
  async waitForQrScan(timeoutMs: number): Promise<boolean> {
    logger.info(`Waiting for QR scan (timeout: ${timeoutMs / 1000}s)...`);

    // Play notification sound
    this.playNotificationSound();

    try {
      await this.page.waitForSelector('text=Le transferiste', { timeout: timeoutMs });
      logger.info('QR scanned successfully!');
      return true;
    } catch {
      logger.warn('QR scan timeout');
      return false;
    }
  }

  /**
   * Play desktop notification sound
   */
  private playNotificationSound(): void {
    const { exec } = require('child_process');
    exec('paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null || echo -e "\\a"');
  }
}

export default MercadoPagoPage;
