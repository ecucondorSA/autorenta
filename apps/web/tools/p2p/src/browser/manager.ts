import { chromium } from 'playwright-extra';
import type { BrowserContext, Page } from 'playwright';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { promises as fs } from 'fs';
import { config } from '../utils/config.js';
import { createServiceLogger } from '../utils/logger.js';
import type { BrowserConfig } from '../types/index.js';

// Add stealth plugin to avoid bot detection
chromium.use(StealthPlugin());

const logger = createServiceLogger('browser');

const PROFILES: Record<string, BrowserConfig> = {
  binance: {
    profileName: 'binance',
    profilePath: config.binanceProfile,
    lockFile: '/tmp/p2p-binance.lock',
  },
  mercadopago: {
    profileName: 'mercadopago',
    profilePath: config.mpProfile,
    lockFile: '/tmp/p2p-mercadopago.lock',
  },
};

export class BrowserManager {
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: BrowserConfig;
  private lockAcquired = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(profileName: 'binance' | 'mercadopago') {
    this.config = PROFILES[profileName];
  }

  async acquireLock(): Promise<boolean> {
    try {
      // Check if lock file exists and is recent (< 5 minutes)
      const stats = await fs.stat(this.config.lockFile).catch(() => null);

      if (stats) {
        const lockAge = Date.now() - stats.mtimeMs;
        if (lockAge < 5 * 60 * 1000) {
          // Lock is held by another process
          const pid = await fs.readFile(this.config.lockFile, 'utf8');
          logger.warn(`Profile ${this.config.profileName} locked by PID ${pid.trim()}`);
          return false;
        }
        // Stale lock, remove it
        logger.info(`Removing stale lock for ${this.config.profileName}`);
        await fs.unlink(this.config.lockFile);
      }

      // Create lock file with our PID
      await fs.writeFile(this.config.lockFile, String(process.pid));
      this.lockAcquired = true;

      logger.info(`Acquired lock for ${this.config.profileName} profile (PID: ${process.pid})`);
      return true;
    } catch (error) {
      logger.error(`Failed to acquire lock: ${error}`);
      return false;
    }
  }

  async releaseLock(): Promise<void> {
    if (this.lockAcquired) {
      await fs.unlink(this.config.lockFile).catch(() => {});
      this.lockAcquired = false;
      logger.info(`Released lock for ${this.config.profileName} profile`);
    }
  }

  private startHeartbeat(): void {
    // Update lock file timestamp every 30 seconds to keep it fresh
    this.heartbeatInterval = setInterval(async () => {
      if (this.lockAcquired) {
        try {
          const now = new Date();
          await fs.utimes(this.config.lockFile, now, now);
        } catch {
          // Ignore errors
        }
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  async launch(): Promise<Page> {
    if (!this.lockAcquired) {
      const acquired = await this.acquireLock();
      if (!acquired) {
        throw new Error(`Cannot acquire lock for ${this.config.profileName}`);
      }
    }

    logger.info(`Launching browser with profile: ${this.config.profilePath}`);

    this.context = await chromium.launchPersistentContext(this.config.profilePath, {
      headless: config.headless,
      viewport: { width: 1280, height: 720 },
      args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
    });

    // Start heartbeat to keep lock fresh
    this.startHeartbeat();

    // Get existing page or create new one
    this.page = this.context.pages()[0] || await this.context.newPage();

    logger.info(`Browser launched for ${this.config.profileName}`);
    return this.page;
  }

  async close(): Promise<void> {
    this.stopHeartbeat();

    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
      logger.info(`Browser closed for ${this.config.profileName}`);
    }

    await this.releaseLock();
  }

  getPage(): Page | null {
    return this.page;
  }

  getContext(): BrowserContext | null {
    return this.context;
  }

  isLocked(): boolean {
    return this.lockAcquired;
  }
}

// Cleanup on process exit
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, cleaning up...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, cleaning up...');
  process.exit(0);
});

export default BrowserManager;
