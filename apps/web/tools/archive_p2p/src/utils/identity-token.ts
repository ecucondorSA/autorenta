import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import { createServiceLogger } from './logger.js';

const execAsync = promisify(exec);
const logger = createServiceLogger('identity-token');

const IDENTITY_PACKAGE = 'com.entrust.identityGuard.mobile';
const SCREENSHOT_PATH = '/tmp/identity_screen.png';

/**
 * Identity Token Reader
 *
 * Uses ADB + Tesseract OCR to read the 6-digit token code
 * from Entrust IdentityGuard app on connected Android device.
 *
 * Flow:
 * 1. Launch Identity app on phone
 * 2. Wait for app to show token
 * 3. Take screenshot via ADB
 * 4. Extract 6-digit code with OCR
 */
export class IdentityTokenReader {

  /**
   * Check if phone is connected via ADB
   */
  async isPhoneConnected(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('adb devices');
      const lines = stdout.trim().split('\n');
      // First line is "List of devices attached", actual devices follow
      return lines.length > 1 && lines.some(line => line.includes('device') && !line.includes('List'));
    } catch {
      return false;
    }
  }

  /**
   * Wake up phone screen
   */
  async wakeScreen(): Promise<void> {
    try {
      // Check if screen is on
      const { stdout } = await execAsync('adb shell dumpsys power | grep "Display Power"');
      const isScreenOn = stdout.includes('state=ON');

      if (!isScreenOn) {
        // Press power button to wake
        await execAsync('adb shell input keyevent KEYCODE_WAKEUP');
        await this.sleep(500);
      }

      // Swipe up to unlock (if needed)
      await execAsync('adb shell input swipe 500 1500 500 500 300');
      await this.sleep(300);
    } catch (error) {
      logger.warn(`Wake screen failed: ${error}`);
    }
  }

  /**
   * Launch Identity app
   */
  async launchIdentityApp(): Promise<boolean> {
    try {
      // Launch the app
      await execAsync(`adb shell monkey -p ${IDENTITY_PACKAGE} -c android.intent.category.LAUNCHER 1`);
      await this.sleep(2000); // Wait for app to load

      logger.info('Identity app launched');
      return true;
    } catch (error) {
      logger.error(`Failed to launch Identity app: ${error}`);
      return false;
    }
  }

  /**
   * Take screenshot from phone
   */
  async takeScreenshot(): Promise<string | null> {
    try {
      // Take screenshot on device
      await execAsync('adb shell screencap -p /sdcard/identity_screen.png');

      // Pull to local
      await execAsync(`adb pull /sdcard/identity_screen.png ${SCREENSHOT_PATH}`);

      // Clean up on device
      await execAsync('adb shell rm /sdcard/identity_screen.png');

      logger.info('Screenshot captured');
      return SCREENSHOT_PATH;
    } catch (error) {
      logger.error(`Screenshot failed: ${error}`);
      return null;
    }
  }

  /**
   * Extract 6-digit code from screenshot using OCR
   * Specifically looks for TOKEN PRODUBANCO
   */
  async extractCodeFromImage(imagePath: string, tokenName: string = 'PRODUBANCO'): Promise<string | null> {
    try {
      // Use tesseract with full text mode to get context
      const { stdout } = await execAsync(
        `tesseract ${imagePath} stdout --psm 6`
      );

      const lines = stdout.split('\n');

      // Strategy 1: Find line after "TOKEN PRODUBANCO" or the specified token name
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toUpperCase().includes(tokenName.toUpperCase())) {
          // Look at next line or same line for the code
          const searchLines = [lines[i], lines[i + 1] || ''].join(' ');
          const codeMatch = searchLines.match(/(\d{3,4})\s*(\d{3,4})/);
          if (codeMatch) {
            const code = codeMatch[1] + codeMatch[2];
            // Ensure it's 6-8 digits (some tokens are 8 digits)
            if (code.length >= 6 && code.length <= 8) {
              logger.info(`Extracted ${tokenName} code: ${code}`);
              return code.substring(0, 6); // Return first 6 digits
            }
          }
        }
      }

      // Strategy 2: Find all codes in format "XXX XXX" or "XXXX XXXX"
      const allCodes: string[] = [];
      for (const line of lines) {
        const matches = line.match(/(\d{3,4})\s+(\d{3,4})/g);
        if (matches) {
          for (const match of matches) {
            const digits = match.replace(/\s/g, '');
            if (digits.length >= 6) {
              allCodes.push(digits.substring(0, 6));
            }
          }
        }
      }

      // If we found codes, return the last one (usually PRODUBANCO is at bottom)
      if (allCodes.length > 0) {
        // Prefer the last code as PRODUBANCO is typically shown last
        const code = allCodes[allCodes.length - 1];
        logger.info(`Extracted code (position-based): ${code}`);
        return code;
      }

      // Strategy 3: Fallback - find any 6-digit sequence
      const cleanedOutput = stdout.replace(/\s/g, '');
      const fallbackMatch = cleanedOutput.match(/\d{6}/g);
      if (fallbackMatch && fallbackMatch.length > 0) {
        const code = fallbackMatch[fallbackMatch.length - 1]; // Last one
        logger.info(`Extracted code (fallback): ${code}`);
        return code;
      }

      logger.warn('No 6-digit code found in screenshot');
      logger.debug(`OCR output: ${stdout}`);
      return null;
    } catch (error) {
      logger.error(`OCR failed: ${error}`);
      return null;
    }
  }

  /**
   * Get current token code from Identity app
   * Main method to call
   */
  async getTokenCode(): Promise<string | null> {
    logger.info('Getting token code from Identity app...');

    // 1. Check phone connection
    const connected = await this.isPhoneConnected();
    if (!connected) {
      logger.error('Phone not connected via ADB');
      return null;
    }

    // 2. Wake screen and launch app
    await this.wakeScreen();
    await this.launchIdentityApp();

    // 3. Wait a bit for token to appear
    await this.sleep(1500);

    // 4. Take screenshot
    const screenshotPath = await this.takeScreenshot();
    if (!screenshotPath) {
      return null;
    }

    // 5. Extract code with OCR
    const code = await this.extractCodeFromImage(screenshotPath);

    // 6. Clean up
    try {
      fs.unlinkSync(screenshotPath);
    } catch {}

    return code;
  }

  /**
   * Wait for new token (tokens typically refresh every 30s)
   * Use this if current token was just used
   */
  async waitForNewToken(previousCode?: string): Promise<string | null> {
    logger.info('Waiting for new token...');

    const maxWait = 35000; // 35 seconds max
    const checkInterval = 5000; // Check every 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const code = await this.getTokenCode();

      if (code && code !== previousCode) {
        return code;
      }

      await this.sleep(checkInterval);
    }

    logger.warn('Timeout waiting for new token');
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Quick function to get token code
 */
export async function getIdentityToken(): Promise<string | null> {
  const reader = new IdentityTokenReader();
  return reader.getTokenCode();
}

export default IdentityTokenReader;
