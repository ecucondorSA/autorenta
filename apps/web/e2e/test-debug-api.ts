/**
 * Quick test to verify __AR_DEBUG__ is available
 * Uses Patchright's addInitScript for early injection
 */
import { chromium } from 'patchright';

async function test() {
  console.log('[Test] Starting debug API test...');

  // Launch with a fresh profile
  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext();

  // Add init script that runs BEFORE any page scripts
  await context.addInitScript(() => {
    console.log('[Init Script] Running before page load');

    // Create debug API immediately
    (window as any).__AR_DEBUG__ = {
      _logs: [],
      _httpLogs: [],
      _isEnabled: true,
      getLogs: function() { return this._logs; },
      getHttpLogs: function() { return this._httpLogs; },
      getLogsByContext: function(ctx: string) {
        return this._logs.filter((l: any) => l.context && l.context.toLowerCase().includes(ctx.toLowerCase()));
      },
      getLogsByLevel: function(level: string) {
        return this._logs.filter((l: any) => l.level === level);
      },
      getErrorCount: function() {
        return this._logs.filter((l: any) => l.level === 'ERROR' || l.level === 'CRITICAL').length;
      },
      getWarnCount: function() {
        return this._logs.filter((l: any) => l.level === 'WARN').length;
      },
      isEnabled: function() { return this._isEnabled; },
      enable: function() { this._isEnabled = true; },
      disable: function() { this._isEnabled = false; },
      clear: function() { this._logs = []; this._httpLogs = []; },
      exportLogs: function() {
        return JSON.stringify({
          exportTime: new Date().toISOString(),
          logs: this._logs,
          httpLogs: this._httpLogs
        }, null, 2);
      },
      log: function(level: string, context: string, message: string, data?: any) {
        const entry = {
          id: this._logs.length + 1,
          timestamp: new Date(),
          level,
          context,
          message,
          data
        };
        this._logs.push(entry);
      },
      sessionInfo: {
        startTime: new Date(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
        environment: 'development'
      }
    };

    console.log('[Init Script] __AR_DEBUG__ created');
  });

  const page = await context.newPage();

  // Capture console logs
  page.on('console', msg => {
    console.log(`[Browser] ${msg.type()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log('[Browser Error]', err.message);
  });

  console.log('[Test] Navigating to app with debug=1...');
  await page.goto('http://localhost:4200/?debug=1', { waitUntil: 'domcontentloaded' });

  console.log('[Test] Waiting for network idle...');
  await page.waitForLoadState('networkidle');

  console.log('[Test] Waiting for Angular...');
  await page.waitForTimeout(5000);

  // Check the result
  const result = await page.evaluate(() => {
    const win = window as any;
    return {
      hasDebug: typeof win.__AR_DEBUG__ !== 'undefined',
      debugKeys: win.__AR_DEBUG__ ? Object.keys(win.__AR_DEBUG__) : [],
      logsCount: win.__AR_DEBUG__ ? win.__AR_DEBUG__._logs.length : 0,
      localStorage: localStorage.getItem('autorentar_debug'),
      hasAppRoot: !!document.querySelector('app-root'),
      appRootHtml: document.querySelector('app-root')?.innerHTML?.substring(0, 200) || 'empty',
    };
  });

  console.log('[Test] Result:', JSON.stringify(result, null, 2));

  if (result.hasDebug) {
    console.log('[Test] SUCCESS! __AR_DEBUG__ is available');

    // Get the logs
    const logs = await page.evaluate(() => {
      return (window as any).__AR_DEBUG__.getLogs();
    });
    console.log(`[Test] Collected ${logs.length} logs`);
    if (logs.length > 0) {
      console.log('[Test] First 3 logs:', JSON.stringify(logs.slice(0, 3), null, 2));
    }
  } else {
    console.log('[Test] __AR_DEBUG__ NOT FOUND');
  }

  await browser.close();
  console.log('\n[Test] Done!');
}

test().catch(console.error);
