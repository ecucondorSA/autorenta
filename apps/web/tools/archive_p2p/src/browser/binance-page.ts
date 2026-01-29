import type { Page } from 'playwright';
import { createServiceLogger } from '../utils/logger.js';
import { sleep } from '../utils/retry.js';
import type { DetectedOrder, PaymentDetails, MarketPrice } from '../types/index.js';

const logger = createServiceLogger('binance-page');

export class BinancePage {
  constructor(private page: Page) {}

  /**
   * Verify Binance session is active
   */
  async verifySession(): Promise<boolean> {
    try {
      await this.page.goto('https://p2p.binance.com/en/myOrder?tab=1', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await sleep(3000);

      // Check if logged in (should see orders table or user menu)
      const loggedIn = await this.page.$('[class*="orders"]') ||
                       await this.page.$('text=All Orders') ||
                       await this.page.$('[class*="UserCenter"]');

      if (loggedIn) {
        logger.info('Binance session is active');
        return true;
      }

      // Check if redirected to login
      const url = this.page.url();
      if (url.includes('login') || url.includes('accounts')) {
        logger.warn('Binance session expired - needs login');
        return false;
      }

      return true; // Assume logged in if not redirected
    } catch (error) {
      logger.error(`Session verification failed: ${error}`);
      return false;
    }
  }

  /**
   * Extract orders from Binance P2P orders page
   */
  async extractOrders(): Promise<DetectedOrder[]> {
    logger.info('Extracting orders from Binance...');

    try {
      // Navigate to orders page
      await this.page.goto('https://p2p.binance.com/en/fiatOrder?tab=1', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await sleep(3000);

      // Extract orders from DOM using cell-based extraction
      const orders = await this.page.evaluate(() => {
        const results: any[] = [];
        const rows = document.querySelectorAll('table tbody tr');

        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length < 5) continue;

          // Cell 0: Type + Date (e.g., "BuyUSDT2025-12-04 02:21")
          const cell0 = cells[0]?.textContent || '';

          // Cell 1: Order Number + Link (e.g., "22829766184976031744View order detail")
          const cell1 = cells[1]?.textContent || '';
          const orderMatch = cell1.match(/(\d{19,20})/);
          if (!orderMatch) continue;

          // Get link to order detail
          const link = row.querySelector('a[href*="fiatOrderDetail"]') as HTMLAnchorElement;

          // Cell 3: Amount Fiat + Crypto (e.g., "20,891.7 ARS13.9 USDT")
          const cell3 = cells[3]?.textContent || '';
          const arsMatch = cell3.match(/([\d,]+\.?\d*)\s*ARS/i);
          const usdtMatch = cell3.match(/([\d,]+\.?\d*)\s*USDT/i);

          // Cell 4: Counterparty (e.g., "Milycrypto_21View counterparty detailChat")
          const cell4 = cells[4]?.textContent || '';
          const counterpartyMatch = cell4.match(/^([A-Za-z0-9_-]+)/);

          // Cell 5: Status
          const cell5 = cells[5]?.textContent || '';

          const order: any = {
            orderNumber: orderMatch[1],
            href: link?.href || null,
            orderType: cell0.toLowerCase().includes('buy') ? 'buy' :
                       cell0.toLowerCase().includes('sell') ? 'sell' : 'unknown',
            amountFiat: arsMatch ? parseFloat(arsMatch[1].replace(/,/g, '')) : 0,
            amountCrypto: usdtMatch ? parseFloat(usdtMatch[1].replace(/,/g, '')) : 0,
            currency: 'ARS',
            counterparty: counterpartyMatch ? counterpartyMatch[1] : null,
            binanceStatus: cell5.includes('Completed') ? 'completed' :
                          cell5.includes('Cancelled') ? 'cancelled' :
                          cell5.includes('Paid') ? 'paid' :
                          cell5.includes('To Pay') || cell5.includes('Pending') ? 'pending' : 'unknown'
          };

          results.push(order);
        }

        return results;
      });

      logger.info(`Extracted ${orders.length} orders from Binance`);
      return orders;
    } catch (error) {
      logger.error(`Failed to extract orders: ${error}`);
      return [];
    }
  }

  /**
   * Extract payment details from order detail page
   */
  async extractPaymentDetails(orderHref: string): Promise<PaymentDetails | null> {
    logger.info(`Extracting payment details from: ${orderHref}`);

    try {
      await this.page.goto(orderHref, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await sleep(2000);

      const details = await this.page.evaluate(() => {
        const text = document.body.innerText;

        // CVU: 22 digits
        const cvuMatch = text.match(/\b(\d{22})\b/);

        // Alias: word.word.word pattern (common in Argentina)
        const aliasMatch = text.match(/([a-zA-Z0-9]+\.[a-zA-Z0-9]+\.[a-zA-Z0-9]+)/);

        // Holder name (look for common patterns)
        const holderMatch = text.match(/(?:Titular|Nombre|Name)[:\s]+([A-Za-z\s]+?)(?:\n|$)/i);

        return {
          cvu: cvuMatch?.[1] || undefined,
          alias: aliasMatch?.[1] || undefined,
          holder: holderMatch?.[1]?.trim() || undefined,
        };
      });

      if (details.cvu || details.alias) {
        logger.info(`Found payment details - CVU: ${details.cvu || 'N/A'}, Alias: ${details.alias || 'N/A'}`);
        return details;
      }

      logger.warn('No payment details found in order');
      return null;
    } catch (error) {
      logger.error(`Failed to extract payment details: ${error}`);
      return null;
    }
  }

  /**
   * Mark order as paid in Binance
   */
  async markAsPaid(orderHref: string): Promise<boolean> {
    logger.info(`Marking order as paid: ${orderHref}`);

    try {
      await this.page.goto(orderHref, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await sleep(2000);

      // Look for "Transferred, notify seller" or similar button
      const markPaidBtn = await this.page.$('button:has-text("Transferred")') ||
                          await this.page.$('button:has-text("I\'ve Paid")') ||
                          await this.page.$('button:has-text("Paid")');

      if (markPaidBtn) {
        await markPaidBtn.click();
        logger.info('Clicked mark as paid button');

        // Wait for confirmation dialog
        await sleep(1000);

        // Confirm if dialog appears
        const confirmBtn = await this.page.$('button:has-text("Confirm")') ||
                          await this.page.$('button:has-text("Yes")');
        if (confirmBtn) {
          await confirmBtn.click();
          logger.info('Confirmed payment');
        }

        await sleep(2000);

        // Verify status changed
        const paidStatus = await this.page.$('text=Paid') ||
                          await this.page.$('text=Payment Completed');

        if (paidStatus) {
          logger.info('Order marked as paid successfully');
          return true;
        }
      }

      logger.warn('Could not find mark as paid button');
      return false;
    } catch (error) {
      logger.error(`Failed to mark as paid: ${error}`);
      return false;
    }
  }
  /**
   * Release USDT for a specific order (Sell Flow)
   * Stops at 2FA step for user intervention
   */
  async releaseOrder(orderHref: string): Promise<{ success: boolean; status: string }> {
    logger.info(`Initiating release sequence for order: ${orderHref}`);

    try {
      await this.page.goto(orderHref, { waitUntil: 'domcontentloaded' });
      await sleep(3000);

      // 1. Verify we can release
      const releaseBtn = await this.page.$('button:has-text("Payment received")');
      if (!releaseBtn) {
        // Check if already released
        if (await this.page.$('text=Order Completed')) {
          return { success: true, status: 'already_completed' };
        }
        return { success: false, status: 'button_not_found' };
      }

      // 2. Click Release
      await releaseBtn.click();
      logger.info('Clicked "Payment received"');
      await sleep(1000);

      // 3. Handle "I have received payment" modal
      // Binance usually asks: "I have received the correct amount..."
      // Selector strategy: Look for the checkbox with positive confirmation
      try {
        // Wait for modal
        await this.page.waitForSelector('.bn-dialog-content', { timeout: 5000 });
        
        // Find the "I have received the correct amount" checkbox/radio
        // Note: Selectors change often, look for text content
        const correctAmountLabel = await this.page.locator('label', { hasText: 'I have received the correct amount' }).first();
        if (correctAmountLabel) {
           await correctAmountLabel.click();
           logger.info('Selected "Correct amount" verification');
        } else {
           // Fallback for different UI versions
           await this.page.click('input[type="checkbox"]'); // Risky if multiple checkboxes
        }
        
        await sleep(500);

        // Click Confirmation Button in Modal
        const confirmBtn = await this.page.$('button:has-text("Confirm Release")') || 
                           await this.page.$('button:has-text("Confirm")');
        
        if (confirmBtn) {
          await confirmBtn.click();
          logger.info('Clicked Confirm in modal');
        }

      } catch (e) {
        logger.error(`Error in release modal: ${e}`);
        return { success: false, status: 'modal_error' };
      }

      // 4. Wait for Security Verification (2FA)
      // The script yields here. User must enter code.
      logger.info('🛑 WAITING FOR USER 2FA INPUT...');
      
      // Monitor for success (redirect or status change)
      // We wait up to 60s for user to enter code manually
      try {
        await this.page.waitForFunction(() => {
            return document.body.innerText.includes('Order Completed') || 
                   document.body.innerText.includes('Successfully sold');
        }, { timeout: 60000 });
        
        return { success: true, status: 'released_after_2fa' };
      } catch {
        return { success: false, status: '2fa_timeout' };
      }

    } catch (error) {
      logger.error(`Release failed: ${error}`);
      return { success: false, status: 'error' };
    }
  }

  /**
   * Scrape market prices from Binance P2P trade page
   * @param fiat - Fiat currency (e.g., 'ARS', 'USD')
   * @param tradeType - 'buy' or 'sell' (from user perspective: buy = sellers, sell = buyers)
   * @param limit - Max number of prices to extract (default 10)
   */
  async scrapeMarketPrices(
    fiat: string,
    tradeType: 'buy' | 'sell',
    limit: number = 10
  ): Promise<MarketPrice[]> {
    logger.info(`Scraping ${tradeType} prices for USDT/${fiat}...`);

    try {
      // Binance P2P URL: trade type from advertiser perspective
      // - If user wants to BUY USDT, we show SELL ads (people selling USDT)
      // - If user wants to SELL USDT, we show BUY ads (people buying USDT)
      const advertiserType = tradeType === 'buy' ? 'SELL' : 'BUY';
      const url = `https://p2p.binance.com/en/trade/${advertiserType}/USDT?fiat=${fiat}&payment=all-payments`;

      await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await sleep(3000);

      // Wait for ads to load
      await this.page.waitForSelector('[class*="css-"]', { timeout: 10000 }).catch(() => {});

      // Extract prices from DOM
      const prices = await this.page.evaluate((params) => {
        const { fiat, tradeType, limit } = params;
        const results: any[] = [];

        // Find all ad rows - Binance uses a list of divs for ads
        // Each ad typically contains: price, available amount, limits, payment methods, advertiser info
        const adRows = document.querySelectorAll('[data-testid="ad-list-row"], .css-1m1f8hn, [class*="AdItem"]');

        // Fallback: if specific selectors don't work, try to find ad containers
        let containers = adRows.length > 0 ? adRows :
          document.querySelectorAll('[class*="css-"] > div > div > div');

        // Alternative approach: look for price elements and traverse up to find ad container
        if (containers.length === 0) {
          const priceSpans = document.querySelectorAll('[class*="headline"]');
          containers = Array.from(priceSpans).map(p => p.closest('[class*="css-"]')!).filter(Boolean);
        }

        let position = 0;
        const processedPrices = new Set<string>();

        for (const container of containers) {
          if (position >= limit) break;

          const text = container.textContent || '';

          // Extract price (number followed by currency)
          const priceMatch = text.match(/([\d,]+\.?\d*)\s*(?:ARS|USD|BRL|CLP|COP|MXN|PEN)/i);
          if (!priceMatch) continue;

          const price = parseFloat(priceMatch[1].replace(/,/g, ''));
          if (isNaN(price) || price <= 0) continue;

          // Avoid duplicates (same price from same container structure)
          const priceKey = `${price}-${position}`;
          if (processedPrices.has(priceKey)) continue;
          processedPrices.add(priceKey);

          // Extract available amount (USDT amount)
          const availableMatch = text.match(/(?:Available|Disponible)[:\s]*([\d,]+\.?\d*)\s*USDT/i) ||
                                  text.match(/([\d,]+\.?\d*)\s*USDT/i);
          const available = availableMatch ? parseFloat(availableMatch[1].replace(/,/g, '')) : undefined;

          // Extract limits
          const limitsMatch = text.match(/(?:Limit|Límite)[:\s]*([\d,]+\.?\d*)\s*[-–~]\s*([\d,]+\.?\d*)/i) ||
                              text.match(/([\d,]+\.?\d*)\s*[-–~]\s*([\d,]+\.?\d*)\s*(?:ARS|USD)/i);
          const minLimit = limitsMatch ? parseFloat(limitsMatch[1].replace(/,/g, '')) : 0;
          const maxLimit = limitsMatch ? parseFloat(limitsMatch[2].replace(/,/g, '')) : 0;

          // Extract advertiser name (usually a username pattern)
          const nameMatch = text.match(/^([A-Za-z0-9_-]+)\s*\n/) ||
                            text.match(/([A-Za-z][A-Za-z0-9_-]+)\s*(?:\d+\s*orders|\d+%)/);
          const advertiserName = nameMatch ? nameMatch[1] : undefined;

          // Extract completion rate
          const completionMatch = text.match(/([\d.]+)\s*%\s*(?:completion|completado)/i) ||
                                   text.match(/([\d.]+)%/);
          const completionRate = completionMatch ? parseFloat(completionMatch[1]) : undefined;

          // Extract number of trades
          const tradesMatch = text.match(/([\d,]+)\s*(?:orders?|trades?|órdenes?)/i);
          const trades = tradesMatch ? parseInt(tradesMatch[1].replace(/,/g, '')) : undefined;

          // Extract payment methods (look for bank names, payment apps)
          const paymentMethods: string[] = [];
          const commonMethods = ['MercadoPago', 'Mercado Pago', 'CBU', 'CVU', 'Transferencia', 'Bank Transfer',
                                  'Produbanco', 'Pichincha', 'BanEcuador', 'Guayaquil', 'Pacífico',
                                  'Galicia', 'Santander', 'BBVA', 'Macro', 'Brubank'];
          for (const method of commonMethods) {
            if (text.toLowerCase().includes(method.toLowerCase())) {
              paymentMethods.push(method);
            }
          }

          position++;
          results.push({
            cryptoCurrency: 'USDT',
            fiatCurrency: fiat,
            orderType: tradeType,
            pricePerUnit: price,
            minOrderLimit: minLimit,
            maxOrderLimit: maxLimit,
            availableAmount: available,
            paymentMethods: paymentMethods,
            sourceUserName: advertiserName,
            sourceUserTrades: trades,
            sourceUserCompletionRate: completionRate,
            rankingPosition: position,
          });
        }

        return results;
      }, { fiat, tradeType, limit });

      logger.info(`Extracted ${prices.length} ${tradeType} prices for ${fiat}`);
      return prices as MarketPrice[];

    } catch (error) {
      logger.error(`Failed to scrape market prices: ${error}`);
      return [];
    }
  }
}

export default BinancePage;
