/**
 * Debug Capture Utilities for E2E Tests
 *
 * Utilities to capture, filter, and export debug logs during e2e test execution.
 * Uses browser console events as the primary capture mechanism, with fallback to
 * window.__AR_DEBUG__ when available.
 */
import type { Page, ConsoleMessage } from 'patchright';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../patchright.config';

/**
 * Debug log entry interface
 */
export interface DebugLogEntry {
  id: number;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  context: string;
  message: string;
  data?: unknown;
  source: 'console' | 'debug-api';
}

/**
 * HTTP log entry interface
 */
export interface HttpLogEntry {
  id: number;
  timestamp: string;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  error?: string;
}

/**
 * Log collector that captures console messages
 */
export class LogCollector {
  private logs: DebugLogEntry[] = [];
  private httpLogs: HttpLogEntry[] = [];
  private logIdCounter = 0;
  private httpIdCounter = 0;

  /**
   * Attach to page console events
   */
  attach(page: Page): void {
    page.on('console', (msg: ConsoleMessage) => {
      this.captureConsoleMessage(msg);
    });

    page.on('pageerror', (err: Error) => {
      this.addLog('ERROR', 'PageError', err.message, { stack: err.stack });
    });

    // Capture network requests for HTTP logs
    page.on('request', (request) => {
      const id = ++this.httpIdCounter;
      this.httpLogs.push({
        id,
        timestamp: new Date().toISOString(),
        method: request.method(),
        url: request.url(),
      });
    });

    page.on('response', async (response) => {
      const url = response.url();
      const existing = this.httpLogs.find(h => h.url === url && !h.status);
      if (existing) {
        existing.status = response.status();
        existing.duration = Date.now() - new Date(existing.timestamp).getTime();
      }
    });

    page.on('requestfailed', (request) => {
      const url = request.url();
      const existing = this.httpLogs.find(h => h.url === url && !h.status);
      if (existing) {
        existing.error = request.failure()?.errorText || 'Unknown error';
      }
    });
  }

  /**
   * Capture a console message
   */
  private captureConsoleMessage(msg: ConsoleMessage): void {
    const text = msg.text();
    const type = msg.type();

    // Parse [AR] prefixed messages for structured logging
    const arMatch = text.match(/^\[AR\]\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\s*(.*)$/);
    if (arMatch) {
      const [, , level, context, message] = arMatch;
      this.addLog(
        this.normalizeLevel(level),
        context,
        message,
        undefined,
        'debug-api'
      );
      return;
    }

    // Map console type to log level
    let level: DebugLogEntry['level'] = 'INFO';
    switch (type) {
      case 'debug':
        level = 'DEBUG';
        break;
      case 'info':
      case 'log':
        level = 'INFO';
        break;
      case 'warning':
        level = 'WARN';
        break;
      case 'error':
        level = 'ERROR';
        break;
    }

    this.addLog(level, 'Console', text, undefined, 'console');
  }

  /**
   * Normalize log level string
   */
  private normalizeLevel(level: string): DebugLogEntry['level'] {
    const upper = level.toUpperCase();
    switch (upper) {
      case 'DEBUG':
        return 'DEBUG';
      case 'INFO':
        return 'INFO';
      case 'WARN':
      case 'WARNING':
        return 'WARN';
      case 'ERROR':
        return 'ERROR';
      case 'CRITICAL':
      case 'FATAL':
        return 'CRITICAL';
      default:
        return 'INFO';
    }
  }

  /**
   * Add a log entry
   */
  addLog(
    level: DebugLogEntry['level'],
    context: string,
    message: string,
    data?: unknown,
    source: 'console' | 'debug-api' = 'console'
  ): void {
    this.logs.push({
      id: ++this.logIdCounter,
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      data,
      source,
    });
  }

  /**
   * Get all logs
   */
  getLogs(): DebugLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get HTTP logs
   */
  getHttpLogs(): HttpLogEntry[] {
    return [...this.httpLogs];
  }

  /**
   * Get logs by context
   */
  getLogsByContext(context: string): DebugLogEntry[] {
    const ctx = context.toLowerCase();
    return this.logs.filter(l => l.context.toLowerCase().includes(ctx));
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: DebugLogEntry['level']): DebugLogEntry[] {
    return this.logs.filter(l => l.level === level);
  }

  /**
   * Get error count
   */
  getErrorCount(): number {
    return this.logs.filter(l => l.level === 'ERROR' || l.level === 'CRITICAL').length;
  }

  /**
   * Get warning count
   */
  getWarnCount(): number {
    return this.logs.filter(l => l.level === 'WARN').length;
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
    this.httpLogs = [];
  }

  /**
   * Export logs as JSON
   */
  export(): string {
    return JSON.stringify({
      exportTime: new Date().toISOString(),
      logs: this.logs,
      httpLogs: this.httpLogs,
      metrics: {
        totalLogs: this.logs.length,
        errorCount: this.getErrorCount(),
        warnCount: this.getWarnCount(),
        httpRequests: this.httpLogs.length,
      },
    }, null, 2);
  }
}

// Global collector for backward compatibility
let globalCollector: LogCollector | null = null;

/**
 * Enable debug capture on page
 */
export async function enableDebugCapture(page: Page): Promise<LogCollector> {
  const collector = new LogCollector();
  collector.attach(page);
  globalCollector = collector;

  // Also try to enable via localStorage for when __AR_DEBUG__ becomes available
  try {
    await page.evaluate(() => {
      localStorage.setItem('autorentar_debug', 'true');
      if ((window as any).__AR_DEBUG__) {
        (window as any).__AR_DEBUG__.enable();
      }
    });
  } catch {
    // Ignore - page might not be ready yet
  }

  return collector;
}

/**
 * Get the current log collector
 */
export function getCollector(): LogCollector | null {
  return globalCollector;
}

/**
 * Get all logs from collector or debug service
 */
export async function getLogs(page: Page): Promise<DebugLogEntry[]> {
  // First try global collector
  if (globalCollector) {
    return globalCollector.getLogs();
  }

  // Fallback to debug API
  return page.evaluate(() => {
    return (window as any).__AR_DEBUG__?.getLogs() || [];
  });
}

/**
 * Get logs filtered by context
 */
export async function getLogsByContext(page: Page, context: string): Promise<DebugLogEntry[]> {
  if (globalCollector) {
    return globalCollector.getLogsByContext(context);
  }
  return page.evaluate((ctx) => {
    return (window as any).__AR_DEBUG__?.getLogsByContext(ctx) || [];
  }, context);
}

/**
 * Get logs filtered by level
 */
export async function getLogsByLevel(
  page: Page,
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'
): Promise<DebugLogEntry[]> {
  if (globalCollector) {
    return globalCollector.getLogsByLevel(level);
  }
  return page.evaluate((lvl) => {
    return (window as any).__AR_DEBUG__?.getLogsByLevel(lvl) || [];
  }, level);
}

/**
 * Get HTTP request/response logs
 */
export async function getHttpLogs(page: Page): Promise<HttpLogEntry[]> {
  if (globalCollector) {
    return globalCollector.getHttpLogs();
  }
  return page.evaluate(() => {
    return (window as any).__AR_DEBUG__?.getHttpLogs() || [];
  });
}

/**
 * Get error count
 */
export async function getErrorCount(page: Page): Promise<number> {
  if (globalCollector) {
    return globalCollector.getErrorCount();
  }
  return page.evaluate(() => {
    return (window as any).__AR_DEBUG__?.getErrorCount() || 0;
  });
}

/**
 * Get warning count
 */
export async function getWarnCount(page: Page): Promise<number> {
  if (globalCollector) {
    return globalCollector.getWarnCount();
  }
  return page.evaluate(() => {
    return (window as any).__AR_DEBUG__?.getWarnCount() || 0;
  });
}

/**
 * Check if any errors occurred
 */
export async function hasErrors(page: Page): Promise<boolean> {
  const errorCount = await getErrorCount(page);
  return errorCount > 0;
}

/**
 * Get errors only
 */
export async function getErrors(page: Page): Promise<DebugLogEntry[]> {
  const logs = await getLogs(page);
  return logs.filter(l => l.level === 'ERROR' || l.level === 'CRITICAL');
}

/**
 * Assert no errors occurred during test
 */
export async function assertNoErrors(page: Page): Promise<void> {
  const errors = await getErrors(page);
  if (errors.length > 0) {
    const errorMessages = errors.map(e => `[${e.context}] ${e.message}`).join('\n');
    throw new Error(`Test failed with ${errors.length} error(s):\n${errorMessages}`);
  }
}

/**
 * Assert no critical errors occurred
 */
export async function assertNoCriticalErrors(page: Page): Promise<void> {
  const logs = await getLogs(page);
  const criticals = logs.filter(l => l.level === 'CRITICAL');
  if (criticals.length > 0) {
    const errorMessages = criticals.map(e => `[${e.context}] ${e.message}`).join('\n');
    throw new Error(`Test failed with ${criticals.length} critical error(s):\n${errorMessages}`);
  }
}

/**
 * Check if a specific log message exists
 */
export async function hasLog(
  page: Page,
  context: string,
  messageContains: string
): Promise<boolean> {
  const logs = await getLogsByContext(page, context);
  return logs.some(l => l.message.toLowerCase().includes(messageContains.toLowerCase()));
}

/**
 * Wait for a specific log to appear
 */
export async function waitForLog(
  page: Page,
  context: string,
  messageContains: string,
  timeout = 10000
): Promise<DebugLogEntry | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const logs = await getLogsByContext(page, context);
    const found = logs.find(l =>
      l.message.toLowerCase().includes(messageContains.toLowerCase())
    );
    if (found) return found;
    await page.waitForTimeout(100);
  }

  return null;
}

/**
 * Export logs to JSON string
 */
export async function exportLogs(page: Page): Promise<string> {
  if (globalCollector) {
    return globalCollector.export();
  }
  return page.evaluate(() => {
    return (window as any).__AR_DEBUG__?.exportLogs() || '{}';
  });
}

/**
 * Save logs to file
 */
export async function saveLogsToFile(page: Page, testName: string): Promise<string> {
  const logs = await exportLogs(page);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  // Sanitize test name to be a valid filename
  const safeName = testName.replace(/[/\\:*?"<>|]/g, '-');
  const filename = `${safeName}-${timestamp}.json`;
  const filepath = path.join(config.reportsDir, filename);

  fs.writeFileSync(filepath, logs);
  console.log(`[E2E] Logs saved to: ${filepath}`);

  return filepath;
}

/**
 * Clear all logs
 */
export async function clearLogs(page: Page): Promise<void> {
  if (globalCollector) {
    globalCollector.clear();
  }
  await page.evaluate(() => {
    (window as any).__AR_DEBUG__?.clear();
  });
}

/**
 * Get session info
 */
export async function getSessionInfo(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => {
    return (window as any).__AR_DEBUG__?.sessionInfo || {};
  });
}

/**
 * Generate test report with logs and metrics
 */
export async function generateTestReport(
  page: Page,
  testName: string,
  passed: boolean,
  error?: Error
): Promise<string> {
  const logs = await getLogs(page);
  const httpLogs = await getHttpLogs(page);
  const errorCount = await getErrorCount(page);
  const warnCount = await getWarnCount(page);

  const report = {
    testName,
    passed,
    error: error ? { message: error.message, stack: error.stack } : null,
    timestamp: new Date().toISOString(),
    metrics: {
      totalLogs: logs.length,
      errorCount,
      warnCount,
      httpRequests: httpLogs.length,
      slowRequests: httpLogs.filter(h => (h.duration || 0) > 3000).length,
    },
    logs: logs.slice(-100), // Last 100 logs
    httpLogs: httpLogs.slice(-50), // Last 50 HTTP logs
    errors: logs.filter(l => l.level === 'ERROR' || l.level === 'CRITICAL'),
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeName = testName.replace(/[/\\:*?"<>|]/g, '-');
  const filename = `report-${safeName}-${timestamp}.json`;
  const filepath = path.join(config.reportsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`[E2E] Report saved to: ${filepath}`);

  return filepath;
}
