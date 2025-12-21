import { LoggerService } from '@core/services/infrastructure/logger.service';
import {Injectable, signal, computed, inject} from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Log entry interface
 */
export interface DebugLogEntry {
  id: number;
  timestamp: Date;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  context: string;
  message: string;
  data?: unknown;
  duration?: number;
}

/**
 * Performance metric interface
 */
export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

/**
 * HTTP request log interface
 */
export interface HttpLogEntry {
  id: number;
  timestamp: Date;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  requestSize?: number;
  responseSize?: number;
  error?: string;
}

/**
 * DebugService - Professional debugging service for AutoRenta
 *
 * Features:
 * - Circular buffer for logs (500 entries max)
 * - Real-time log streaming via signals
 * - Performance metrics tracking
 * - HTTP request/response logging
 * - Session info tracking
 * - Export functionality
 *
 * Activation:
 * - URL param: ?debug=1
 * - Triple tap on corner
 * - Programmatically: debugService.enable()
 */
@Injectable({
  providedIn: 'root'
})
export class DebugService {
  private readonly logger = inject(LoggerService);
  private readonly MAX_LOGS = 500;
  private readonly MAX_HTTP_LOGS = 100;
  private logIdCounter = 0;
  private httpIdCounter = 0;

  // Signals for reactive updates
  private readonly _logs = signal<DebugLogEntry[]>([]);
  private readonly _httpLogs = signal<HttpLogEntry[]>([]);
  private readonly _isEnabled = signal<boolean>(false);
  private readonly _isPanelOpen = signal<boolean>(false);
  private readonly _activeMetrics = signal<Map<string, PerformanceMetric>>(new Map());

  // Computed values
  readonly logs = computed(() => this._logs());
  readonly httpLogs = computed(() => this._httpLogs());
  readonly isEnabled = computed(() => this._isEnabled());
  readonly isPanelOpen = computed(() => this._isPanelOpen());

  readonly errorCount = computed(() =>
    this._logs().filter(l => l.level === 'ERROR' || l.level === 'CRITICAL').length
  );

  readonly warnCount = computed(() =>
    this._logs().filter(l => l.level === 'WARN').length
  );

  // Session info
  readonly sessionInfo = {
    startTime: new Date(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
    language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
    screenSize: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
    environment: environment.production ? 'production' : 'development',
  };

  constructor() {
    this.checkAutoEnable();
    this.exposeForE2E();
  }

  /**
   * Expose debug API globally for e2e tests
   * Access via window.__AR_DEBUG__
   * Called from constructor and can be called again after hydration
   */
  exposeForE2E(): void {
    if (typeof window === 'undefined') return;

    // Avoid re-exposing if already done
    const win = window as Window & { __AR_DEBUG__?: unknown };
    if (win.__AR_DEBUG__) return;

    win.__AR_DEBUG__ = {
      getLogs: () => this._logs(),
      getHttpLogs: () => this._httpLogs(),
      getLogsByContext: (ctx: string) => this.getLogsByContext(ctx),
      getLogsByLevel: (level: DebugLogEntry['level']) => this.getLogsByLevel(level),
      getErrorCount: () => this.errorCount(),
      getWarnCount: () => this.warnCount(),
      isEnabled: () => this._isEnabled(),
      enable: () => this.enable(),
      disable: () => this.disable(),
      clear: () => this.clearLogs(),
      exportLogs: () => this.exportLogs(),
      sessionInfo: this.sessionInfo,
    };

    this.logger.debug('[AR] __AR_DEBUG__ exposed globally for e2e tests');
  }

  /**
   * Check if debug should be auto-enabled (via URL param or localStorage)
   */
  private checkAutoEnable(): void {
    if (typeof window === 'undefined') return;

    // Check URL param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === '1') {
      this.enable();
      return;
    }

    // Check localStorage
    if (localStorage.getItem('autorentar_debug') === 'true') {
      this.enable();
    }
  }

  /**
   * Enable debug mode
   */
  enable(): void {
    this._isEnabled.set(true);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('autorentar_debug', 'true');
    }
    this.log('DEBUG', 'DebugService', 'Debug mode enabled');
  }

  /**
   * Disable debug mode
   */
  disable(): void {
    this._isEnabled.set(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('autorentar_debug');
    }
  }

  /**
   * Toggle debug panel visibility
   */
  togglePanel(): void {
    this._isPanelOpen.update(v => !v);
  }

  /**
   * Open debug panel
   */
  openPanel(): void {
    this._isPanelOpen.set(true);
  }

  /**
   * Close debug panel
   */
  closePanel(): void {
    this._isPanelOpen.set(false);
  }

  /**
   * Add a log entry
   */
  log(
    level: DebugLogEntry['level'],
    context: string,
    message: string,
    data?: unknown
  ): void {
    const entry: DebugLogEntry = {
      id: ++this.logIdCounter,
      timestamp: new Date(),
      level,
      context,
      message,
      data,
    };

    // Add to circular buffer
    this._logs.update(logs => {
      const newLogs = [...logs, entry];
      if (newLogs.length > this.MAX_LOGS) {
        return newLogs.slice(-this.MAX_LOGS);
      }
      return newLogs;
    });

    // Console output with [AR] prefix for ADB filtering
    this.consoleLog(entry);
  }

  /**
   * Log HTTP request start
   */
  logHttpStart(method: string, url: string): number {
    const id = ++this.httpIdCounter;
    const entry: HttpLogEntry = {
      id,
      timestamp: new Date(),
      method,
      url,
    };

    this._httpLogs.update(logs => {
      const newLogs = [...logs, entry];
      if (newLogs.length > this.MAX_HTTP_LOGS) {
        return newLogs.slice(-this.MAX_HTTP_LOGS);
      }
      return newLogs;
    });

    return id;
  }

  /**
   * Log HTTP request completion
   */
  logHttpEnd(id: number, status: number, duration: number, responseSize?: number, error?: string): void {
    this._httpLogs.update(logs =>
      logs.map(log =>
        log.id === id
          ? { ...log, status, duration, responseSize, error }
          : log
      )
    );

    // Log slow requests
    if (duration > 3000) {
      const log = this._httpLogs().find(l => l.id === id);
      if (log) {
        this.log('WARN', 'HTTP', `Slow request: ${log.method} ${log.url}`, { duration, status });
      }
    }
  }

  /**
   * Start a performance measurement
   */
  startMetric(name: string): void {
    this._activeMetrics.update(metrics => {
      const newMetrics = new Map(metrics);
      newMetrics.set(name, {
        name,
        startTime: performance.now(),
      });
      return newMetrics;
    });
  }

  /**
   * End a performance measurement
   */
  endMetric(name: string): number | undefined {
    const metrics = this._activeMetrics();
    const metric = metrics.get(name);

    if (!metric) return undefined;

    const duration = performance.now() - metric.startTime;

    this._activeMetrics.update(m => {
      const newMetrics = new Map(m);
      newMetrics.delete(name);
      return newMetrics;
    });

    // Log slow operations
    if (duration > 1000) {
      this.log('WARN', 'Performance', `Slow operation: ${name}`, { duration: `${duration.toFixed(2)}ms` });
    } else {
      this.log('DEBUG', 'Performance', `${name}`, { duration: `${duration.toFixed(2)}ms` });
    }

    return duration;
  }

  /**
   * Console output with professional formatting
   */
  private consoleLog(entry: DebugLogEntry): void {
    const timestamp = this.formatTimestamp(entry.timestamp);
    const prefix = `[AR][${timestamp}][${entry.level}][${entry.context}]`;

    const colors: Record<DebugLogEntry['level'], string> = {
      DEBUG: 'color: #6b7280',
      INFO: 'color: #3b82f6',
      WARN: 'color: #f59e0b',
      ERROR: 'color: #ef4444',
      CRITICAL: 'color: #dc2626; font-weight: bold',
    };

    const style = colors[entry.level];
    const resetStyle = 'color: inherit';

    switch (entry.level) {
      case 'DEBUG':
        console.debug(`%c${prefix}%c ${entry.message}`, style, resetStyle, entry.data ?? '');
        break;
      case 'INFO':
        console.info(`%c${prefix}%c ${entry.message}`, style, resetStyle, entry.data ?? '');
        break;
      case 'WARN':
        console.warn(`%c${prefix}%c ${entry.message}`, style, resetStyle, entry.data ?? '');
        break;
      case 'ERROR':
      case 'CRITICAL':
        console.error(`%c${prefix}%c ${entry.message}`, style, resetStyle, entry.data ?? '');
        break;
    }
  }

  /**
   * Format timestamp for logging
   */
  private formatTimestamp(date: Date): string {
    return date.toISOString().substring(11, 23); // HH:mm:ss.SSS
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: DebugLogEntry['level']): DebugLogEntry[] {
    return this._logs().filter(l => l.level === level);
  }

  /**
   * Get logs filtered by context
   */
  getLogsByContext(context: string): DebugLogEntry[] {
    return this._logs().filter(l => l.context.toLowerCase().includes(context.toLowerCase()));
  }

  /**
   * Search logs by message
   */
  searchLogs(query: string): DebugLogEntry[] {
    const q = query.toLowerCase();
    return this._logs().filter(l =>
      l.message.toLowerCase().includes(q) ||
      l.context.toLowerCase().includes(q)
    );
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this._logs.set([]);
    this._httpLogs.set([]);
    this.log('INFO', 'DebugService', 'Logs cleared');
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    const exportData = {
      sessionInfo: this.sessionInfo,
      exportTime: new Date().toISOString(),
      logs: this._logs(),
      httpLogs: this._httpLogs(),
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Download logs as file
   */
  downloadLogs(): void {
    const data = this.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autorentar-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Copy logs to clipboard
   */
  async copyLogsToClipboard(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(this.exportLogs());
      this.log('INFO', 'DebugService', 'Logs copied to clipboard');
      return true;
    } catch {
      this.log('ERROR', 'DebugService', 'Failed to copy logs to clipboard');
      return false;
    }
  }
}
