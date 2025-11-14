# 🔍 Playwright CDP Debugging Guide

This guide covers how to use Chrome DevTools Protocol (CDP) for live debugging of Playwright tests in AutoRenta.

## 🚀 Quick Start

```bash
# Start the complete debugging workflow
npm run debug:cdp

# Or step by step:
npm run debug:chrome    # Start Chrome with CDP
npm run dev:web        # Start development server
npm run test:cdp:ui    # Run tests with Playwright UI
```

## 📋 Prerequisites

- Chrome browser installed
- Development server running (`npm run dev:web`)
- Chrome with CDP enabled (`npm run debug:chrome`)

## 🛠️ Available Commands

### Debug Commands
```bash
npm run debug:chrome     # Start Chrome with CDP on port 9222
npm run debug:cdp        # Interactive debugging workflow
npm run debug:ws         # Get WebSocket endpoint for CDP
```

### Test Commands
```bash
npm run test:cdp         # Run tests with CDP connection
npm run test:cdp:ui      # Run tests with Playwright UI + CDP
npm run codegen:cdp      # Generate tests with live Chrome
```

## 🎯 Debugging Features

### Chrome CDP Configuration
- **Live DevTools**: Full Chrome DevTools access
- **Real-time DOM**: Inspect elements during test execution
- **Network monitoring**: Monitor API calls and responses
- **Console logging**: Debug application and test logs
- **Performance profiling**: Analyze performance metrics
- **Breakpoints**: Set breakpoints in application code

### Playwright CDP Config
- **Trace collection**: Always enabled for debugging
- **Screenshots**: Captured on every action
- **Video recording**: Full test execution recording
- **Slow motion**: 500ms delay between actions
- **Extended timeouts**: Longer timeouts for debugging
- **Multiple viewports**: Desktop, mobile, and tablet

### Testsprite Integration
- **Browser control**: Connect to Chrome via CDP
- **Step-by-step execution**: Pause on failures
- **Verbose logging**: Detailed execution logs
- **Visual debugging**: Screenshots and videos
- **Performance tracking**: Metrics and traces

## 📊 Configuration Files

### Playwright CDP Config (`playwright.config.cdp.ts`)
```typescript
// Connects to Chrome via WebSocket
connectOptions: {
  wsEndpoint: process.env.CHROME_CDP_WS_ENDPOINT
}

// Debug-friendly settings
trace: 'on',
screenshot: 'on',
video: 'on',
slowMo: 500
```

### Testsprite Config (`testsprite.config.json`)
```json
{
  "browser": {
    "connectOverCDP": true,
    "cdpPort": 9222,
    "devtools": true,
    "slowMo": 250
  },
  "debugging": {
    "pauseOnFailure": true,
    "stepByStep": true,
    "verboseLogging": true
  }
}
```

## 🔧 Debug Workflow

### 1. Setup Phase
```bash
# Terminal 1: Start Chrome with CDP
npm run debug:chrome

# Terminal 2: Start development server
npm run dev:web

# Terminal 3: Get WebSocket endpoint
npm run debug:ws
```

### 2. Testing Phase
```bash
# Option A: Interactive workflow
npm run debug:cdp

# Option B: Direct test execution
npm run test:cdp:ui

# Option C: Specific test
npx playwright test tests/e2e/car-publication.spec.ts --config=playwright.config.cdp.ts --ui
```

### 3. Code Generation
```bash
# Generate tests while interacting with the app
npm run codegen:cdp
```

## 🎮 Debugging Techniques

### Browser DevTools
1. Open Chrome DevTools: `http://localhost:9222`
2. Navigate to your app: `http://localhost:4200`
3. Set breakpoints in application code
4. Run Playwright tests to trigger breakpoints

### Playwright Trace Viewer
```bash
# After test execution, view traces
npx playwright show-trace test-results/artifacts/trace.zip
```

### Step-by-Step Debugging
```bash
# Run test with debug flag
npx playwright test --debug --config=playwright.config.cdp.ts

# Or use the inspector
npx playwright test --headed --config=playwright.config.cdp.ts
```

### Network Inspection
```bash
# Monitor network requests during test
# Check Chrome DevTools Network tab while test runs
```

## 🔍 Common Debug Scenarios

### Test Failing Silently
1. Enable trace collection: `trace: 'on'`
2. Check console logs in DevTools
3. Review network requests for API errors
4. Use `page.pause()` to inspect state

### Element Not Found
1. Use `page.pause()` before the failing action
2. Inspect DOM in DevTools
3. Check for dynamic content loading
4. Verify selectors with `page.$eval()`

### Timing Issues
1. Increase timeouts in CDP config
2. Use `page.waitForLoadState()`
3. Add explicit waits: `page.waitForTimeout()`
4. Check network requests completion

### Authentication Issues
1. Verify storage state files
2. Check cookies in DevTools
3. Monitor auth API calls
4. Use `page.context().storageState()`

## 📁 Generated Artifacts

Debug sessions generate various artifacts:

```
test-results/
├── artifacts/          # Screenshots, videos, traces
├── html-report/        # Interactive HTML report
├── results.json        # JSON test results
└── junit.xml          # JUnit format results
```

### Viewing Artifacts
```bash
# Open HTML report
npx playwright show-report

# View specific trace
npx playwright show-trace test-results/artifacts/trace.zip

# View screenshots
open test-results/artifacts/test-failed-1-chromium/screenshot.png
```

## 🚨 Troubleshooting

### Chrome CDP Not Starting
```bash
# Check if port 9222 is in use
lsof -i :9222

# Kill existing Chrome processes
pkill -f "chrome.*remote-debugging"

# Restart Chrome CDP
npm run debug:chrome
```

### WebSocket Connection Failed
```bash
# Verify Chrome is running with CDP
curl http://localhost:9222/json/version

# Check WebSocket endpoint
npm run debug:ws

# Export endpoint manually
export CHROME_CDP_WS_ENDPOINT="ws://localhost:9222/devtools/browser"
```

### Dev Server Not Responding
```bash
# Check if server is running
curl http://localhost:4200

# Restart development server
npm run dev:web

# Check for port conflicts
lsof -i :4200
```

### Tests Not Connecting to CDP
```bash
# Verify environment variable
echo $CHROME_CDP_WS_ENDPOINT

# Test connection manually
npx playwright test --config=playwright.config.cdp.ts --list

# Check CDP config
npx playwright test --config=playwright.config.cdp.ts --reporter=list
```

## 📚 Advanced Usage

### Custom CDP Scripts
```javascript
// In your test file
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('ws://localhost:9222/devtools/browser');
const context = browser.contexts()[0];
const page = context.pages()[0];
```

### Performance Profiling
```javascript
// Start performance trace
await page.tracing.start({ screenshots: true, snapshots: true });

// Your test actions here

// Stop and save trace
await page.tracing.stop({ path: 'trace.json' });
```

### Network Monitoring
```javascript
// Monitor all network requests
page.on('request', request => {
  console.log('Request:', request.url());
});

page.on('response', response => {
  console.log('Response:', response.url(), response.status());
});
```

## 🎯 Best Practices

1. **Always use CDP for interactive debugging**
2. **Enable slow motion for better observation**
3. **Use trace viewer for post-mortem analysis**
4. **Set breakpoints in both test and app code**
5. **Monitor network requests for API issues**
6. **Use screenshots and videos for documentation**
7. **Keep Chrome CDP running during development**
8. **Use specific selectors for reliable tests**

## 📖 Resources

- [Playwright Debugging Docs](https://playwright.dev/docs/debug)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Testsprite Documentation](https://testsprite.com/docs)
- [AutoRenta Testing Guide](./TESTING.md)