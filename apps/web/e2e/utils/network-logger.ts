/**
 * Network-based Logger for E2E Tests
 *
 * Patchright disables console for stealth mode, so we use network
 * interception instead of page.on('console') to capture logs.
 *
 * This logger tracks:
 * - HTTP requests and responses
 * - Page errors
 * - Request timing/duration
 */

import type { Page, Request, Response } from 'patchright';

export interface NetworkLogEntry {
  id: number;
  timestamp: string;
  type: 'request' | 'response' | 'error';
  method: string;
  url: string;
  status?: number;
  statusText?: string;
  duration?: number;
  error?: string;
  resourceType?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
}

export interface PageErrorEntry {
  id: number;
  timestamp: string;
  message: string;
  stack?: string;
}

export interface NetworkLoggerOptions {
  maxEntries?: number;
  captureHeaders?: boolean;
  filterUrls?: string[];
}

export class NetworkLogger {
  private logs: NetworkLogEntry[] = [];
  private errors: PageErrorEntry[] = [];
  private requestTimestamps = new Map<string, number>();
  private idCounter = 0;
  private errorIdCounter = 0;
  private options: NetworkLoggerOptions;

  constructor(options: NetworkLoggerOptions = {}) {
    this.options = {
      maxEntries: 1000,
      captureHeaders: false,
      filterUrls: [],
      ...options,
    };
  }

  /**
   * Attach logger to page - call this before navigating
   */
  attach(page: Page): void {
    // Track requests
    page.on('request', (request: Request) => {
      const url = request.url();

      // Skip filtered URLs (like analytics, images, etc.)
      if (this.shouldFilter(url)) return;

      const id = ++this.idCounter;
      this.requestTimestamps.set(url + request.method(), Date.now());

      const entry: NetworkLogEntry = {
        id,
        timestamp: new Date().toISOString(),
        type: 'request',
        method: request.method(),
        url,
        resourceType: request.resourceType(),
      };

      if (this.options.captureHeaders) {
        entry.requestHeaders = request.headers();
      }

      this.addLog(entry);
    });

    // Track responses
    page.on('response', (response: Response) => {
      const url = response.url();
      const method = response.request().method();

      if (this.shouldFilter(url)) return;

      const key = url + method;
      const startTime = this.requestTimestamps.get(key);
      const duration = startTime ? Date.now() - startTime : undefined;
      this.requestTimestamps.delete(key);

      const entry: NetworkLogEntry = {
        id: ++this.idCounter,
        timestamp: new Date().toISOString(),
        type: 'response',
        method,
        url,
        status: response.status(),
        statusText: response.statusText(),
        duration,
      };

      if (this.options.captureHeaders) {
        entry.responseHeaders = response.headers();
      }

      this.addLog(entry);
    });

    // Track failed requests
    page.on('requestfailed', (request: Request) => {
      const url = request.url();

      if (this.shouldFilter(url)) return;

      this.addLog({
        id: ++this.idCounter,
        timestamp: new Date().toISOString(),
        type: 'error',
        method: request.method(),
        url,
        error: request.failure()?.errorText || 'Request failed',
        resourceType: request.resourceType(),
      });
    });

    // Track page errors (JavaScript errors)
    page.on('pageerror', (error: Error) => {
      this.errors.push({
        id: ++this.errorIdCounter,
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
      });
    });
  }

  private shouldFilter(url: string): boolean {
    if (!this.options.filterUrls?.length) return false;
    return this.options.filterUrls.some((pattern) => url.includes(pattern));
  }

  private addLog(entry: NetworkLogEntry): void {
    this.logs.push(entry);

    // Trim if exceeds max
    if (this.logs.length > (this.options.maxEntries || 1000)) {
      this.logs = this.logs.slice(-500);
    }
  }

  /**
   * Get all network logs
   */
  getLogs(): NetworkLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by URL pattern
   */
  getApiCalls(pattern?: string | RegExp): NetworkLogEntry[] {
    if (!pattern) return this.getLogs();

    return this.logs.filter((log) => {
      if (typeof pattern === 'string') {
        return log.url.includes(pattern);
      }
      return pattern.test(log.url);
    });
  }

  /**
   * Get only requests (no responses)
   */
  getRequests(): NetworkLogEntry[] {
    return this.logs.filter((l) => l.type === 'request');
  }

  /**
   * Get only responses
   */
  getResponses(): NetworkLogEntry[] {
    return this.logs.filter((l) => l.type === 'response');
  }

  /**
   * Get failed requests (network errors or 4xx/5xx)
   */
  getFailedRequests(): NetworkLogEntry[] {
    return this.logs.filter(
      (l) => l.type === 'error' || (l.status && l.status >= 400)
    );
  }

  /**
   * Get all page errors (JavaScript errors)
   */
  getPageErrors(): PageErrorEntry[] {
    return [...this.errors];
  }

  /**
   * Check if there are any page errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Check if a specific API was called
   */
  wasApiCalled(urlPattern: string | RegExp): boolean {
    return this.getApiCalls(urlPattern).length > 0;
  }

  /**
   * Get API call count for pattern
   */
  getApiCallCount(urlPattern: string | RegExp): number {
    return this.getApiCalls(urlPattern).filter((l) => l.type === 'request')
      .length;
  }

  /**
   * Get average response time for pattern
   */
  getAverageResponseTime(urlPattern?: string | RegExp): number {
    const responses = this.getApiCalls(urlPattern).filter(
      (l) => l.type === 'response' && l.duration !== undefined
    );

    if (responses.length === 0) return 0;

    const totalDuration = responses.reduce(
      (sum, r) => sum + (r.duration || 0),
      0
    );
    return Math.round(totalDuration / responses.length);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
    this.errors = [];
    this.requestTimestamps.clear();
    this.idCounter = 0;
    this.errorIdCounter = 0;
  }

  /**
   * Export logs as JSON string
   */
  export(): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        networkLogs: this.logs,
        pageErrors: this.errors,
        summary: {
          totalRequests: this.getRequests().length,
          totalResponses: this.getResponses().length,
          failedRequests: this.getFailedRequests().length,
          pageErrors: this.errors.length,
          avgResponseTime: this.getAverageResponseTime(),
        },
      },
      null,
      2
    );
  }

  /**
   * Generate summary for test reports
   */
  getSummary(): {
    totalRequests: number;
    totalResponses: number;
    failedRequests: number;
    pageErrors: number;
    avgResponseTime: number;
    apiBreakdown: Record<string, number>;
  } {
    // Group by API endpoint
    const apiBreakdown: Record<string, number> = {};
    this.getRequests().forEach((req) => {
      try {
        const url = new URL(req.url);
        const endpoint = url.pathname.split('/').slice(0, 3).join('/');
        apiBreakdown[endpoint] = (apiBreakdown[endpoint] || 0) + 1;
      } catch {
        // Invalid URL, skip
      }
    });

    return {
      totalRequests: this.getRequests().length,
      totalResponses: this.getResponses().length,
      failedRequests: this.getFailedRequests().length,
      pageErrors: this.errors.length,
      avgResponseTime: this.getAverageResponseTime(),
      apiBreakdown,
    };
  }
}

/**
 * Assert no page errors occurred
 */
export function assertNoPageErrors(logger: NetworkLogger): void {
  const errors = logger.getPageErrors();
  if (errors.length > 0) {
    const errorMessages = errors.map((e) => e.message).join('\n');
    throw new Error(`Page errors detected:\n${errorMessages}`);
  }
}

/**
 * Assert no failed API requests
 */
export function assertNoFailedRequests(
  logger: NetworkLogger,
  ignorePatterns?: string[]
): void {
  let failed = logger.getFailedRequests();

  if (ignorePatterns?.length) {
    failed = failed.filter(
      (f) => !ignorePatterns.some((p) => f.url.includes(p))
    );
  }

  if (failed.length > 0) {
    const failedUrls = failed
      .map((f) => `${f.method} ${f.url} -> ${f.status || f.error}`)
      .join('\n');
    throw new Error(`Failed API requests:\n${failedUrls}`);
  }
}
